/**
 * AdsService — unified AdMob integration
 *
 * Wraps react-native-google-mobile-ads with:
 *   • AppConfig gate (enabled / testMode / per-type toggles)
 *   • Cooldown tracking to prevent ad spam
 *   • Hard safety guard: interstitials are NEVER shown during playback
 *   • Subscriber bypass: no ads for premium users
 *
 * Platform support:
 *   iOS / Android : react-native-google-mobile-ads
 *   Web / Electron: no-op (AdMob is mobile-only)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig, getAdUnitId, shouldShowAds } from '../config/appConfig';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { usePlayerStore } from '../store/playerStore';

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEY_LAST_APP_OPEN   = '@ads/last_app_open';
const KEY_LAST_INTERSTITIAL = '@ads/last_interstitial';

// ─── Platform guard ───────────────────────────────────────────────────────────
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// ─── Lazy AdMob import ────────────────────────────────────────────────────────
let _mobileAds: any = null;

async function getMobileAds() {
  if (!isMobile) return null;
  if (_mobileAds) return _mobileAds;
  try {
    _mobileAds = await import('react-native-google-mobile-ads');
    return _mobileAds;
  } catch {
    return null;
  }
}

// ─── Initialise AdMob SDK ─────────────────────────────────────────────────────

export async function initializeAds(): Promise<void> {
  if (!isMobile || !AppConfig.ads.enabled) return;

  const lib = await getMobileAds();
  if (!lib) return;

  await lib.default().initialize();

  if (AppConfig.ads.testMode) {
    // Enable Google's test mode
    await lib.default().setRequestConfiguration({
      testDeviceIdentifiers: ['EMULATOR'],
      maxAdContentRating: lib.MaxAdContentRating.PG,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function msSinceLastShown(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key).catch(() => null);
  if (!raw) return Infinity;
  return Date.now() - Number(raw);
}

async function recordShown(key: string): Promise<void> {
  await AsyncStorage.setItem(key, String(Date.now())).catch(() => {});
}

function isSubscriber(): boolean {
  return useSubscriptionStore.getState().isSubscriber;
}

function isPlaying(): boolean {
  return usePlayerStore.getState().isPlaying;
}

// ─── App Open Ad ──────────────────────────────────────────────────────────────

let _appOpenAd: any = null;

export async function preloadAppOpenAd(): Promise<void> {
  const cfg = AppConfig.ads.appOpenAd;
  if (!isMobile || !AppConfig.ads.enabled || !cfg.enabled) return;

  const lib = await getMobileAds();
  if (!lib) return;

  const unitId = getAdUnitId('appOpen');
  _appOpenAd = await lib.AppOpenAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: false });
  await _appOpenAd.load();
}

export async function showAppOpenAdIfEligible(): Promise<boolean> {
  const cfg = AppConfig.ads.appOpenAd;
  if (!AppConfig.ads.enabled || !cfg.enabled) return false;
  if (!shouldShowAds(isSubscriber())) return false;

  const ms = await msSinceLastShown(KEY_LAST_APP_OPEN);
  const cooldownMs = cfg.cooldownHours * 3_600_000;
  if (ms < cooldownMs) return false;

  if (!_appOpenAd) await preloadAppOpenAd();
  if (!_appOpenAd) return false;

  try {
    await _appOpenAd.show();
    await recordShown(KEY_LAST_APP_OPEN);
    _appOpenAd = null; // preload next one lazily
    void preloadAppOpenAd();
    return true;
  } catch {
    return false;
  }
}

// ─── Interstitial Ad ──────────────────────────────────────────────────────────

let _interstitialAd: any = null;
let _interstitialLoaded = false;

export async function preloadInterstitialAd(): Promise<void> {
  const cfg = AppConfig.ads.interstitialAd;
  if (!isMobile || !AppConfig.ads.enabled || !cfg.enabled) return;

  const lib = await getMobileAds();
  if (!lib) return;

  const unitId = getAdUnitId('interstitial');
  _interstitialAd = await lib.InterstitialAd.createForAdRequest(unitId);

  _interstitialAd.addAdEventListener(lib.AdEventType.LOADED, () => {
    _interstitialLoaded = true;
  });

  _interstitialAd.load();
}

/**
 * Show an interstitial at a safe breakpoint.
 *
 * @param reason  'video_close' | 'back_navigation'
 * @returns true if ad was shown
 *
 * Safety rules enforced here:
 *   1. Ads globally disabled → skip
 *   2. User is subscriber → skip
 *   3. Video is currently playing → NEVER show (hard block)
 *   4. Cooldown period not expired → skip
 */
export async function showInterstitialAtBreakpoint(
  reason: 'video_close' | 'back_navigation'
): Promise<boolean> {
  const cfg = AppConfig.ads.interstitialAd;

  // ── Safety checks ──────────────────────────────────────────────
  if (!AppConfig.ads.enabled || !cfg.enabled) return false;
  if (!shouldShowAds(isSubscriber())) return false;

  // HARD BLOCK: never interrupt playback
  if (cfg.neverDuringPlayback && isPlaying()) return false;

  if (reason === 'back_navigation' && !cfg.showOnBackNavigation) return false;
  if (reason === 'video_close'    && !cfg.showOnVideoClose)     return false;

  const ms = await msSinceLastShown(KEY_LAST_INTERSTITIAL);
  if (ms < cfg.cooldownSeconds * 1_000) return false;

  if (!_interstitialLoaded || !_interstitialAd) {
    await preloadInterstitialAd();
    return false; // ad wasn't ready yet; try next time
  }

  try {
    await _interstitialAd.show();
    await recordShown(KEY_LAST_INTERSTITIAL);
    _interstitialLoaded = false;
    _interstitialAd = null;
    void preloadInterstitialAd(); // preload next
    return true;
  } catch {
    return false;
  }
}

// ─── No-op stub for non-mobile platforms ─────────────────────────────────────

export const AdsService = {
  init: initializeAds,
  preloadAppOpen: preloadAppOpenAd,
  showAppOpen: showAppOpenAdIfEligible,
  preloadInterstitial: preloadInterstitialAd,
  showInterstitial: showInterstitialAtBreakpoint,

  /** Convenience: call after every video close */
  onVideoClose: () => showInterstitialAtBreakpoint('video_close'),

  /** Convenience: call on hardware back / navigate-back */
  onBackNavigation: () => showInterstitialAtBreakpoint('back_navigation'),
};

export default AdsService;

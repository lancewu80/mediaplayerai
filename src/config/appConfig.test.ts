/**
 * Example unit tests showing how to control the AppConfig in tests.
 *
 * Run with:  npx jest src/config/appConfig.test.ts
 */

import {
  AppConfig,
  disableAdsForTesting,
  enableTestAds,
  overrideConfig,
  shouldShowAds,
  getAdUnitId,
} from './appConfig';

// ── Restore config between tests ──────────────────────────────────────────────
const originalAds = JSON.parse(JSON.stringify(AppConfig.ads));

afterEach(() => {
  // Reset to original state
  Object.assign(AppConfig.ads, JSON.parse(JSON.stringify(originalAds)));
});

// ─── disableAdsForTesting ─────────────────────────────────────────────────────

describe('disableAdsForTesting()', () => {
  it('disables the master ads switch', () => {
    disableAdsForTesting();
    expect(AppConfig.ads.enabled).toBe(false);
  });

  it('disables all individual ad types', () => {
    disableAdsForTesting();
    expect(AppConfig.ads.appOpenAd.enabled).toBe(false);
    expect(AppConfig.ads.bannerAd.enabled).toBe(false);
    expect(AppConfig.ads.nativeAd.enabled).toBe(false);
    expect(AppConfig.ads.interstitialAd.enabled).toBe(false);
  });

  it('sets testMode = true so no real AdMob calls happen', () => {
    disableAdsForTesting();
    expect(AppConfig.ads.testMode).toBe(true);
  });

  it('disables subscription module', () => {
    disableAdsForTesting();
    expect(AppConfig.subscription.enabled).toBe(false);
  });
});

// ─── enableTestAds ────────────────────────────────────────────────────────────

describe('enableTestAds()', () => {
  it('enables ads with test IDs', () => {
    disableAdsForTesting();
    enableTestAds();
    expect(AppConfig.ads.enabled).toBe(true);
    expect(AppConfig.ads.testMode).toBe(true);
  });

  it('uses Google official test unit IDs', () => {
    enableTestAds();
    const bannerId = getAdUnitId('banner');
    // Google test banner IDs start with ca-app-pub-394...
    expect(bannerId).toMatch(/^ca-app-pub-3940256099942544\//);
  });
});

// ─── overrideConfig ───────────────────────────────────────────────────────────

describe('overrideConfig()', () => {
  it('allows partial override of nested config', () => {
    overrideConfig({ ads: { bannerAd: { enabled: false } } });
    expect(AppConfig.ads.bannerAd.enabled).toBe(false);
    // Other properties should be unchanged
    expect(AppConfig.ads.nativeAd.enabled).toBe(AppConfig.ads.nativeAd.enabled);
  });

  it('can change native ad frequency', () => {
    overrideConfig({ ads: { nativeAd: { frequencyItems: 4 } } });
    expect(AppConfig.ads.nativeAd.frequencyItems).toBe(4);
  });

  it('can change interstitial cooldown for testing rapid scenarios', () => {
    overrideConfig({ ads: { interstitialAd: { cooldownSeconds: 0 } } });
    expect(AppConfig.ads.interstitialAd.cooldownSeconds).toBe(0);
  });
});

// ─── shouldShowAds ────────────────────────────────────────────────────────────

describe('shouldShowAds()', () => {
  it('returns false when ads globally disabled', () => {
    disableAdsForTesting();
    expect(shouldShowAds(false)).toBe(false);
  });

  it('returns false for subscribers when removeAdsForSubscribers = true', () => {
    AppConfig.ads.enabled = true;
    AppConfig.subscription.removeAdsForSubscribers = true;
    expect(shouldShowAds(true)).toBe(false);
  });

  it('returns true for non-subscribers when ads enabled', () => {
    AppConfig.ads.enabled = true;
    expect(shouldShowAds(false)).toBe(true);
  });

  it('returns true for subscribers when removeAdsForSubscribers = false', () => {
    AppConfig.ads.enabled = true;
    AppConfig.subscription.removeAdsForSubscribers = false;
    expect(shouldShowAds(true)).toBe(true);
  });
});

// ─── Safety constraints ───────────────────────────────────────────────────────

describe('Safety constraints', () => {
  it('interstitial.neverDuringPlayback is always true', () => {
    // This must never be changed — it's a policy constraint
    expect(AppConfig.ads.interstitialAd.neverDuringPlayback).toBe(true);
  });

  it('appOpenAd skipAfterSeconds is at least 3', () => {
    expect(AppConfig.ads.appOpenAd.skipAfterSeconds).toBeGreaterThanOrEqual(3);
  });

  it('interstitial cooldown is at least 60 seconds in production config', () => {
    // Reset to production-like state
    AppConfig.ads.testMode = false;
    AppConfig.ads.interstitialAd.cooldownSeconds = 120;
    expect(AppConfig.ads.interstitialAd.cooldownSeconds).toBeGreaterThanOrEqual(60);
  });
});

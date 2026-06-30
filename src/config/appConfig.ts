/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              MediaPlayer AI — Master App Config                  ║
 * ║                                                                  ║
 * ║  All feature flags are controlled here.                          ║
 * ║  Override in unit tests by importing and mutating:               ║
 * ║                                                                  ║
 * ║    import { AppConfig } from '@/config/appConfig';               ║
 * ║    AppConfig.ads.enabled = false;   // disable all ads           ║
 * ║                                                                  ║
 * ║  Or set environment variables (Expo / dotenv):                   ║
 * ║    EXPO_PUBLIC_ADS_ENABLED=false npx expo start                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { Platform } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const env = (key: string, fallback: string): string =>
  (typeof process !== 'undefined' && process.env?.[key]) ?? fallback;

const envBool = (key: string, fallback: boolean): boolean => {
  const v = env(key, '');
  if (v === '') return fallback;
  return v.toLowerCase() !== 'false' && v !== '0';
};

const isDev = __DEV__ ?? false;

// ─── Ads Config ───────────────────────────────────────────────────────────────

export interface AdsFeatureConfig {
  /** Master switch — set false to disable ALL ads (e.g. in unit tests) */
  enabled: boolean;

  /** Use AdMob test ad unit IDs instead of production IDs */
  testMode: boolean;

  /** Show App Open Ad on first daily launch */
  appOpenAd: {
    enabled: boolean;
    /** Seconds before skip button appears (Google policy min = 5, we use 3 for UX) */
    skipAfterSeconds: number;
    /** Don't show again within this many hours after one display */
    cooldownHours: number;
  };

  /** Banner ad shown in Playlist footer & Settings screen */
  bannerAd: {
    enabled: boolean;
    showInPlaylist: boolean;
    showInSettings: boolean;
  };

  /** Native ad cards injected into the playlist every N items */
  nativeAd: {
    enabled: boolean;
    /** Insert a native ad card every N real media items */
    frequencyItems: number;
    showInPlaylist: boolean;
  };

  /** Interstitial shown only at safe breakpoints (after closing video / back nav) */
  interstitialAd: {
    enabled: boolean;
    /** Minimum seconds between two interstitials */
    cooldownSeconds: number;
    /** Show after user closes the video player */
    showOnVideoClose: boolean;
    /** Show when navigating back from a deep screen */
    showOnBackNavigation: boolean;
    /** NEVER show during playback — enforced in AdsService regardless of this flag */
    neverDuringPlayback: true;
  };
}

export interface SubscriptionConfig {
  enabled: boolean;
  /** RevenueCat API key (iOS/Android in-app purchase) */
  revenueCatApiKey: string;
  monthlyProductId: string;
  yearlyProductId: string;
  /** Trial days for new subscribers */
  trialDays: number;
  /** Hide all ads for subscribers */
  removeAdsForSubscribers: boolean;
}

export interface StreamingConfig {
  smb: { enabled: boolean };
  ftp: { enabled: boolean };
  webdav: { enabled: boolean };
  googleDrive: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
  };
  dropbox: {
    enabled: boolean;
    appKey: string;
  };
}

export interface MetadataConfig {
  /** TMDB API key — get one free at https://www.themoviedb.org/settings/api */
  tmdbApiKey: string;
  /** Automatically fetch poster & synopsis when a video file is added */
  autoFetch: boolean;
  /** Cache metadata locally for this many days */
  cacheDays: number;
}

export interface AdsUnitIds {
  // Android
  android: {
    appOpen: string;
    banner: string;
    native: string;
    interstitial: string;
  };
  // iOS
  ios: {
    appOpen: string;
    banner: string;
    native: string;
    interstitial: string;
  };
}

// ─── Default AdMob Unit IDs ───────────────────────────────────────────────────
// Replace these with your real AdMob unit IDs before release.
// Test IDs are Google's official test unit IDs.

const TEST_UNIT_IDS: AdsUnitIds = {
  android: {
    appOpen:      'ca-app-pub-3940256099942544/9257395921',
    banner:       'ca-app-pub-3940256099942544/6300978111',
    native:       'ca-app-pub-3940256099942544/2247696110',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  ios: {
    appOpen:      'ca-app-pub-3940256099942544/5575463023',
    banner:       'ca-app-pub-3940256099942544/2934735716',
    native:       'ca-app-pub-3940256099942544/3986624511',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
};

// ⚠️ Replace with your real production unit IDs before publishing!
const PROD_UNIT_IDS: AdsUnitIds = {
  android: {
    appOpen:      env('EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN',      'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
    banner:       env('EXPO_PUBLIC_ADMOB_ANDROID_BANNER',        'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
    native:       env('EXPO_PUBLIC_ADMOB_ANDROID_NATIVE',        'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
    interstitial: env('EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL',  'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
  },
  ios: {
    appOpen:      env('EXPO_PUBLIC_ADMOB_IOS_APP_OPEN',          'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
    banner:       env('EXPO_PUBLIC_ADMOB_IOS_BANNER',            'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
    native:       env('EXPO_PUBLIC_ADMOB_IOS_NATIVE',            'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
    interstitial: env('EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL',      'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'),
  },
};

// ─── Master AppConfig ─────────────────────────────────────────────────────────

export const AppConfig = {
  // ── Ads ─────────────────────────────────────────────────────────────────────
  ads: {
    enabled:  envBool('EXPO_PUBLIC_ADS_ENABLED', !isDev),
    testMode: envBool('EXPO_PUBLIC_ADS_TEST_MODE', isDev),

    appOpenAd: {
      enabled:          envBool('EXPO_PUBLIC_ADS_APP_OPEN', true),
      skipAfterSeconds: 3,
      cooldownHours:    24,
    },

    bannerAd: {
      enabled:        envBool('EXPO_PUBLIC_ADS_BANNER', true),
      showInPlaylist: true,
      showInSettings: true,
    },

    nativeAd: {
      enabled:       envBool('EXPO_PUBLIC_ADS_NATIVE', true),
      frequencyItems: 8,    // show a native ad every 8 media items
      showInPlaylist: true,
    },

    interstitialAd: {
      enabled:              envBool('EXPO_PUBLIC_ADS_INTERSTITIAL', true),
      cooldownSeconds:      120,   // at least 2 min between interstitials
      showOnVideoClose:     true,
      showOnBackNavigation: false,
      neverDuringPlayback:  true as const,
    },
  } satisfies AdsFeatureConfig,

  // ── AdMob unit IDs (resolved at runtime) ────────────────────────────────────
  get adUnitIds(): AdsUnitIds {
    return this.ads.testMode ? TEST_UNIT_IDS : PROD_UNIT_IDS;
  },

  // ── Subscription ─────────────────────────────────────────────────────────────
  subscription: {
    enabled:                 envBool('EXPO_PUBLIC_SUB_ENABLED', true),
    revenueCatApiKey:        env('EXPO_PUBLIC_REVENUECAT_KEY', ''),
    monthlyProductId:        'mediaplayerai_premium_monthly',
    yearlyProductId:         'mediaplayerai_premium_yearly',
    trialDays:               7,
    removeAdsForSubscribers: true,
  } satisfies SubscriptionConfig,

  // ── Network Streaming ─────────────────────────────────────────────────────────
  streaming: {
    smb:    { enabled: envBool('EXPO_PUBLIC_SMB_ENABLED', true) },
    ftp:    { enabled: envBool('EXPO_PUBLIC_FTP_ENABLED', true) },
    webdav: { enabled: envBool('EXPO_PUBLIC_WEBDAV_ENABLED', true) },
    googleDrive: {
      enabled:      envBool('EXPO_PUBLIC_GDRIVE_ENABLED', true),
      clientId:     env('EXPO_PUBLIC_GDRIVE_CLIENT_ID', ''),
      clientSecret: env('EXPO_PUBLIC_GDRIVE_CLIENT_SECRET', ''),
    },
    dropbox: {
      enabled: envBool('EXPO_PUBLIC_DROPBOX_ENABLED', true),
      appKey:  env('EXPO_PUBLIC_DROPBOX_APP_KEY', ''),
    },
  } satisfies StreamingConfig,

  // ── Metadata (TMDB) ───────────────────────────────────────────────────────────
  metadata: {
    tmdbApiKey: env('EXPO_PUBLIC_TMDB_API_KEY', ''),
    autoFetch:  envBool('EXPO_PUBLIC_METADATA_AUTO_FETCH', true),
    cacheDays:  30,
  } satisfies MetadataConfig,
};

// ─── Unit-test helper ─────────────────────────────────────────────────────────

/**
 * Call this in your test setup to disable all ads and subscriptions.
 *
 * @example
 * import { disableAdsForTesting } from '@/config/appConfig';
 * beforeAll(() => disableAdsForTesting());
 */
export function disableAdsForTesting(): void {
  AppConfig.ads.enabled = false;
  AppConfig.ads.testMode = true;
  AppConfig.ads.appOpenAd.enabled = false;
  AppConfig.ads.bannerAd.enabled = false;
  AppConfig.ads.nativeAd.enabled = false;
  AppConfig.ads.interstitialAd.enabled = false;
  AppConfig.subscription.enabled = false;
}

/**
 * Call this to enable test-mode ads (uses Google's test unit IDs).
 */
export function enableTestAds(): void {
  AppConfig.ads.enabled = true;
  AppConfig.ads.testMode = true;
}

/**
 * Partially override config for specific test scenarios.
 *
 * @example
 * overrideConfig({ ads: { enabled: true, bannerAd: { enabled: false } } });
 */
export function overrideConfig(patch: DeepPartial<typeof AppConfig>): void {
  deepMerge(AppConfig, patch);
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source ?? {})) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// ─── Convenience getters ──────────────────────────────────────────────────────

/** Returns the correct AdMob unit ID for the current platform */
export function getAdUnitId(type: keyof AdsUnitIds['android']): string {
  const ids = AppConfig.adUnitIds;
  return Platform.OS === 'ios' ? ids.ios[type] : ids.android[type];
}

/** True if ads are globally enabled and user is not a subscriber */
export function shouldShowAds(isSubscriber: boolean): boolean {
  if (!AppConfig.ads.enabled) return false;
  if (isSubscriber && AppConfig.subscription.removeAdsForSubscribers) return false;
  return true;
}

/**
 * Jest per-test setup
 * Mocks platform-specific native modules that aren't available in Node.
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock AdMob — prevents errors when ads disabled
jest.mock('react-native-google-mobile-ads', () => ({
  default: () => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
  }),
  AppOpenAd: { createForAdRequest: jest.fn().mockResolvedValue({ load: jest.fn(), show: jest.fn() }) },
  InterstitialAd: { createForAdRequest: jest.fn().mockResolvedValue({ load: jest.fn(), show: jest.fn(), addAdEventListener: jest.fn() }) },
  BannerAd: 'View',
  NativeAd: 'View',
  BannerAdSize: { BANNER: 'BANNER' },
  AdEventType: { LOADED: 'loaded', ERROR: 'error' },
  MaxAdContentRating: { PG: 'PG' },
}), { virtual: true });

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  default: {
    configure: jest.fn().mockResolvedValue(undefined),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    getOfferings: jest.fn().mockResolvedValue({ current: null }),
    purchasePackage: jest.fn().mockRejectedValue({ userCancelled: true }),
    restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  },
}), { virtual: true });

// Mock VLC player
jest.mock('react-native-vlc-media-player', () => 'VLCPlayer', { virtual: true });

// Mock react-native-google-cast
jest.mock('react-native-google-cast', () => ({
  CastContext: {
    getDiscoveryManager: () => ({ getDevices: jest.fn().mockResolvedValue([]) }),
    getSessionManager: () => ({ getCurrentCastSession: () => null }),
    castMedia: jest.fn(),
    endCurrentSession: jest.fn(),
  },
}), { virtual: true });

// Mock expo modules
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}), { virtual: true });

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  unlockAsync: jest.fn(),
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
}), { virtual: true });

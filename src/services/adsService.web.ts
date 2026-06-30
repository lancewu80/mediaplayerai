/**
 * adsService.web.ts — Web / Electron stub
 *
 * Metro automatically picks this file over adsService.ts when bundling for web,
 * so react-native-google-mobile-ads (mobile-only) is never imported on web.
 * All exports are no-ops that satisfy the same interface.
 */

export async function initializeAds(): Promise<void> {}
export async function preloadAppOpenAd(): Promise<void> {}
export async function showAppOpenAdIfEligible(): Promise<boolean> { return false; }
export async function preloadInterstitialAd(): Promise<void> {}
export async function showInterstitialAtBreakpoint(
  _reason: 'video_close' | 'back_navigation'
): Promise<boolean> { return false; }

export const AdsService = {
  init: initializeAds,
  preloadAppOpen: preloadAppOpenAd,
  showAppOpen: showAppOpenAdIfEligible,
  preloadInterstitial: preloadInterstitialAd,
  showInterstitial: showInterstitialAtBreakpoint,
  onVideoClose: () => Promise.resolve(false),
  onBackNavigation: () => Promise.resolve(false),
};

export default AdsService;

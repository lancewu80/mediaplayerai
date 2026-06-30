/**
 * BannerAdView
 *
 * Renders a Google AdMob banner (mobile) or nothing (web/Electron).
 * Respects AppConfig.ads.bannerAd.enabled and subscriber status.
 *
 * Usage:
 *   <BannerAdView placement="playlist" />
 *   <BannerAdView placement="settings" />
 */

import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { AppConfig, getAdUnitId, shouldShowAds } from '../../config/appConfig';
import { useSubscriptionStore } from '../../store/subscriptionStore';

type Placement = 'playlist' | 'settings';

interface Props {
  placement: Placement;
}

// Lazy: only import mobile ads lib on mobile
let BannerAdComponent: any = null;
let BannerAdSize: any = null;

if (Platform.OS !== 'web') {
  import('react-native-google-mobile-ads').then((m) => {
    BannerAdComponent = m.BannerAd;
    BannerAdSize = m.BannerAdSize;
  }).catch(() => {});
}

export default function BannerAdView({ placement }: Props) {
  const { isSubscriber } = useSubscriptionStore();
  const cfg = AppConfig.ads.bannerAd;

  // Feature gates
  if (!AppConfig.ads.enabled) return null;
  if (!cfg.enabled) return null;
  if (placement === 'playlist' && !cfg.showInPlaylist) return null;
  if (placement === 'settings' && !cfg.showInSettings) return null;
  if (!shouldShowAds(isSubscriber)) return null;

  // Web/Electron: no AdMob
  if (Platform.OS === 'web') return null;

  const unitId = getAdUnitId('banner');

  if (!BannerAdComponent || !BannerAdSize) {
    // Library not loaded yet
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.adDisclosure}>Advertisement</Text>
      <BannerAdComponent
        unitId={unitId}
        size={BannerAdSize.BANNER}               // 320×50
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={(e: any) => console.warn('Banner ad failed', e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#0f0f1e',
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
  },
  adDisclosure: {
    color: '#555',
    fontSize: 9,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  placeholder: { height: 52, backgroundColor: '#0f0f1e' },
});

/**
 * NativeAdCard
 *
 * A native-style ad card inserted into the playlist every N items.
 * On mobile: renders react-native-google-mobile-ads NativeAd.
 * On web/Electron: renders nothing.
 *
 * Usage (inside FlatList renderItem):
 *   if (shouldInsertNativeAd(index)) return <NativeAdCard />;
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppConfig, getAdUnitId, shouldShowAds } from '../../config/appConfig';
import { useSubscriptionStore } from '../../store/subscriptionStore';

interface Props {
  style?: object;
}

export default function NativeAdCard({ style }: Props) {
  const { isSubscriber } = useSubscriptionStore();
  const cfg = AppConfig.ads.nativeAd;

  if (!AppConfig.ads.enabled || !cfg.enabled || !shouldShowAds(isSubscriber)) return null;
  if (Platform.OS === 'web') return null;

  return <MobileNativeAd style={style} />;
}

function MobileNativeAd({ style }: { style?: object }) {
  const [adData, setAdData] = useState<any>(null);
  const [NativeAdView, setNativeAdView] = useState<any>(null);

  useEffect(() => {
    import('react-native-google-mobile-ads').then((m) => {
      setNativeAdView(() => m.NativeAd ?? null);
    }).catch(() => {});
  }, []);

  if (!NativeAdView) {
    return (
      <View style={[styles.card, style]}>
        <View style={styles.adBadge}><Text style={styles.adBadgeText}>Ad</Text></View>
        <View style={styles.placeholder}>
          <Ionicons name="megaphone" size={20} color="#555" />
          <Text style={styles.placeholderText}>Advertisement loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <NativeAdView
      adUnitId={getAdUnitId('native')}
      onAdLoaded={(ad: any) => setAdData(ad)}
      onAdFailedToLoad={() => setAdData(null)}
    >
      <View style={[styles.card, style]}>
        <View style={styles.adBadge}><Text style={styles.adBadgeText}>Ad</Text></View>
        {adData ? (
          <View style={styles.content}>
            {adData.icon && (
              <Image source={{ uri: adData.icon.url }} style={styles.icon} />
            )}
            <View style={styles.info}>
              <Text style={styles.headline} numberOfLines={1}>{adData.headline}</Text>
              <Text style={styles.body} numberOfLines={2}>{adData.body}</Text>
              <Text style={styles.advertiser}>{adData.advertiser}</Text>
            </View>
            {adData.callToAction && (
              <TouchableOpacity style={styles.cta}>
                <Text style={styles.ctaText}>{adData.callToAction}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="megaphone" size={20} color="#555" />
          </View>
        )}
      </View>
    </NativeAdView>
  );
}

/**
 * Helper: determine whether a native ad card should be inserted at `index`
 * in the playlist FlatList.
 */
export function shouldInsertNativeAd(index: number, isSubscriber: boolean): boolean {
  const cfg = AppConfig.ads.nativeAd;
  if (!AppConfig.ads.enabled || !cfg.enabled || !cfg.showInPlaylist) return false;
  if (!shouldShowAds(isSubscriber)) return false;
  if (index === 0) return false; // never the very first item
  return index % cfg.frequencyItems === 0;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#13132a',
    borderRadius: 10, marginHorizontal: 12,
    marginVertical: 4, overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  adBadge: {
    position: 'absolute', top: 6, right: 8, zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  } as any,
  adBadgeText: { color: '#666', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 8 },
  info: { flex: 1 },
  headline: { color: '#fff', fontSize: 13, fontWeight: '600' },
  body: { color: '#a0a0b0', fontSize: 11, marginTop: 2 },
  advertiser: { color: '#555', fontSize: 10, marginTop: 2 },
  cta: {
    backgroundColor: '#e94560', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  placeholder: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, opacity: 0.4 },
  placeholderText: { color: '#555', fontSize: 12 },
});

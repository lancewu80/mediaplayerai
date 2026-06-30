import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Platform, SafeAreaView, TouchableOpacity,
  Text, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePlayerStore } from './store/playerStore';
import { useSubscriptionStore } from './store/subscriptionStore';

// Core panels
import ControlPanel from './components/ControlPanel';
import PlaylistPanel from './components/Playlist/PlaylistPanel';
import VideoPlayerWindow from './components/VideoPlayer/VideoPlayerWindow';

// Ads
import AppOpenAdScreen from './components/Ads/AppOpenAdScreen';
import BannerAdView from './components/Ads/BannerAdView';

// Subscription
import SubscriptionModal from './components/Subscription/SubscriptionModal';

// Services
import AdsService from './services/adsService';
import { initializeSubscriptions } from './services/subscriptionService';
import { AppConfig } from './config/appConfig';
import { useThemeStore } from './store/themeStore';
import { useLangStore } from './store/langStore';
import { getTheme } from './theme';

const GOLD = '#f5c518';

// ── 廣告測試用（上架前刪掉這兩行）─────────────────────────────────────────────
// AppConfig.enableTestAds();   // 取消註解 → 顯示 Google 測試廣告
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const { currentItem, playTrigger } = usePlayerStore();
  const { isSubscriber, plan } = useSubscriptionStore();
  const { isDark, load: loadTheme } = useThemeStore();
  const { t, load: loadLang } = useLangStore();
  const C = getTheme(isDark);

  const [appReady, setAppReady] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [subModalVisible, setSubModalVisible] = useState(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      // Restore saved theme + language preferences
      await Promise.all([loadTheme(), loadLang()]);

      // Init subscriptions first (gates ads)
      await initializeSubscriptions();

      // Init AdMob SDK
      await AdsService.init();

      // Preload ads for later
      void AdsService.preloadInterstitial();
    }
    bootstrap().catch(console.error);
  }, []);

  // ── Video auto-open ────────────────────────────────────────────────────────
  // Watch playTrigger: fires on every setCurrentItem() AND openVideo() call,
  // so re-clicking the same video after ESC always re-opens the player.
  useEffect(() => {
    if (currentItem?.type === 'video') setVideoVisible(true);
  }, [playTrigger]);

  // ── Video close → interstitial breakpoint ─────────────────────────────────
  function handleVideoClose() {
    setVideoVisible(false);
    void AdsService.onVideoClose();
  }

  // ── After App Open Ad finishes → app is ready ─────────────────────────────
  function handleAdDone() {
    setAppReady(true);
  }

  return (
    <>
      {/* App Open Ad gate — only shown on cold launch, once per 24h */}
      {!appReady && (
        <AppOpenAdScreen onDone={handleAdDone} />
      )}

      <SafeAreaView style={[styles.root, { backgroundColor: C.bg }, !appReady && { display: 'none' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.surface} />

        {/* ── Top bar: branding + subscription button ── */}
        <View style={[styles.topBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Text style={[styles.appName, { color: C.text }]}>🎵 {t('appName')}</Text>
          <View style={styles.topBarRight}>
            {isSubscriber ? (
              <TouchableOpacity onPress={() => setSubModalVisible(true)} style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color={GOLD} />
                <Text style={styles.premiumText}>{t('premium')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setSubModalVisible(true)} style={styles.upgradeBtn}>
                <Ionicons name="diamond-outline" size={13} color={GOLD} />
                <Text style={styles.upgradeText}>{t('goPremium')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Control panel ── */}
        <View style={styles.controlSection}>
          <ControlPanel />
        </View>

        {/* ── Accent divider ── */}
        <View style={[styles.divider, { backgroundColor: C.accent }]} />

        {/* ── Playlist ── */}
        <View style={styles.playlistSection}>
          <PlaylistPanel />
        </View>

        {/* ── Banner Ad (below playlist, above safe area) ── */}
        <BannerAdView placement="playlist" />

        {/* ── Video player (modal) ── */}
        <VideoPlayerWindow
          visible={videoVisible}
          onClose={handleVideoClose}
        />

        {/* ── Subscription modal ── */}
        <SubscriptionModal
          visible={subModalVisible}
          onClose={() => setSubModalVisible(false)}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    ...Platform.select({
      web: { height: '100vh' as any, display: 'flex' as any, flexDirection: 'column' as any },
    }),
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
    borderBottomWidth: 1,
  },
  appName: { fontSize: 16, fontWeight: '800' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,197,24,0.4)',
  },
  premiumText: { color: GOLD, fontSize: 11, fontWeight: '700' },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,197,24,0.08)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,197,24,0.25)',
  },
  upgradeText: { color: GOLD, fontSize: 11, fontWeight: '600' },
  controlSection: { flexShrink: 0 },
  divider: { height: 3, flexShrink: 0 },
  playlistSection: { flex: 1, overflow: 'hidden' },
});

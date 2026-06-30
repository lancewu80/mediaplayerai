/**
 * AppOpenAdScreen
 *
 * Shown on app launch (once per 24 h by default).
 * Renders a full-screen overlay with a countdown skip button.
 *
 * On mobile this delegates to AdsService.showAppOpen() which uses AdMob.
 * On web/Electron it renders nothing (AdMob is mobile-only).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppConfig } from '../../config/appConfig';
import { showAppOpenAdIfEligible } from '../../services/adsService';
import { useSubscriptionStore } from '../../store/subscriptionStore';

interface Props {
  onDone: () => void;
}

export default function AppOpenAdScreen({ onDone }: Props) {
  const { isSubscriber } = useSubscriptionStore();
  const [countdown, setCountdown] = useState(AppConfig.ads.appOpenAd.skipAfterSeconds);
  const [canSkip, setCanSkip] = useState(false);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cfg = AppConfig.ads.appOpenAd;

    // Skip entirely on web/Electron or if ads disabled or subscriber
    if (
      Platform.OS === 'web' ||
      !AppConfig.ads.enabled ||
      !cfg.enabled ||
      isSubscriber
    ) {
      onDone();
      return;
    }

    // Mobile: hand off to AdMob SDK — if it shows an ad, onDone is called
    // by the ad closed event (handled in AdsService). Show our overlay as
    // a loading / pre-roll screen in the meantime.
    void (async () => {
      const shown = await showAppOpenAdIfEligible();
      if (!shown) {
        // No ad to show — proceed immediately
        onDone();
        return;
      }
      // Ad is showing — our overlay is redundant; SDK handles the UI
      onDone();
    })();
  }, []);

  // Web/Electron: render nothing
  if (Platform.OS === 'web') return null;

  // Mobile fallback overlay (in case SDK ad isn't preloaded yet)
  // This is only shown briefly before the real AdMob overlay appears.
  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Ad placeholder */}
        <View style={styles.adSlot}>
          <Ionicons name="play-circle" size={64} color="#e94560" />
          <Text style={styles.adLabel}>Advertisement</Text>
        </View>

        {/* Skip / countdown */}
        <TouchableOpacity
          style={[styles.skipBtn, !canSkip && styles.skipBtnDisabled]}
          onPress={canSkip ? onDone : undefined}
          disabled={!canSkip}
        >
          {canSkip ? (
            <>
              <Text style={styles.skipText}>Skip</Text>
              <Ionicons name="play-forward" size={14} color="#fff" />
            </>
          ) : (
            <Text style={styles.countdownText}>{countdown}s</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  adSlot: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  adLabel: { color: '#555', fontSize: 12 },
  skipBtn: {
    position: 'absolute', top: 48, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  } as any,
  skipBtnDisabled: { opacity: 0.6 },
  skipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  countdownText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

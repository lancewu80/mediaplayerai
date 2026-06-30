import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '../../store/videoStore';
import { ASPECT_RATIOS, PLAYBACK_RATES, AspectRatio } from '../../types/video';

const COLORS = {
  card: '#1a1a2e', border: '#2a2a4a',
  accent: '#e94560', active: '#00d4ff',
  text: '#ffffff', sub: '#a0a0b0',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AspectRatioMenu({ visible, onClose }: Props) {
  const {
    aspectRatio, setAspectRatio,
    keepAwake, setKeepAwake,
    screenLocked, setScreenLocked,
    playbackRate, setPlaybackRate,
  } = useVideoStore();

  async function handleOrientationLock(locked: boolean) {
    setScreenLocked(locked);
    if (Platform.OS !== 'web') {
      try {
        const ScreenOrientation = await import('expo-screen-orientation');
        if (locked) {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        } else {
          await ScreenOrientation.unlockAsync();
        }
      } catch {
        // expo-screen-orientation not available
      }
    }
  }

  async function handleKeepAwake(enabled: boolean) {
    setKeepAwake(enabled);
    if (Platform.OS !== 'web') {
      try {
        const { activateKeepAwakeAsync, deactivateKeepAwake } = await import('expo-keep-awake');
        if (enabled) await activateKeepAwakeAsync();
        else deactivateKeepAwake();
      } catch {
        // expo-keep-awake not available
      }
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Playback Options</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          {/* Aspect ratio */}
          <Text style={styles.sectionTitle}>Aspect Ratio</Text>
          <View style={styles.grid}>
            {ASPECT_RATIOS.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => { setAspectRatio(r.value); onClose(); }}
                style={[styles.chip, aspectRatio === r.value && styles.chipActive]}
              >
                <Text style={[styles.chipText, aspectRatio === r.value && { color: COLORS.accent }]}>
                  {r.label}
                </Text>
                {aspectRatio === r.value && (
                  <Ionicons name="checkmark" size={12} color={COLORS.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Playback speed */}
          <Text style={styles.sectionTitle}>Playback Speed</Text>
          <View style={styles.speedRow}>
            {PLAYBACK_RATES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setPlaybackRate(r)}
                style={[styles.speedChip, playbackRate === r && styles.speedChipActive]}
              >
                <Text style={[styles.speedText, playbackRate === r && { color: COLORS.accent }]}>
                  {r === 1 ? '1×' : `${r}×`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Screen options */}
          <Text style={styles.sectionTitle}>Screen</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Ionicons name="sunny" size={18} color={COLORS.sub} />
                <Text style={styles.toggleLabel}>Keep Screen Awake</Text>
              </View>
              <Switch
                value={keepAwake}
                onValueChange={handleKeepAwake}
                trackColor={{ false: '#3a3a5c', true: COLORS.accent }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Ionicons name="lock-closed" size={18} color={COLORS.sub} />
                <Text style={styles.toggleLabel}>Lock Orientation</Text>
              </View>
              <Switch
                value={screenLocked}
                onValueChange={handleOrientationLock}
                trackColor={{ false: '#3a3a5c', true: COLORS.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { color: COLORS.sub, fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  chipText: { color: COLORS.sub, fontSize: 13 },
  speedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  speedChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  speedChipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  speedText: { color: COLORS.sub, fontSize: 13, fontWeight: '600' },
  toggleRow: { gap: 8, marginBottom: 8 },
  toggleItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f2a', padding: 14, borderRadius: 10,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { color: '#fff', fontSize: 14 },
});

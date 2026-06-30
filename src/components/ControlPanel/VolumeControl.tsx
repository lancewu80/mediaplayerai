import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';

export default function VolumeControl() {
  const { volume, isMuted, setVolume, setMuted } = usePlayerStore();

  const displayVolume = isMuted ? 0 : volume;

  function handleToggleMute() {
    setMuted(!isMuted);
  }

  function volumeIcon(): keyof typeof Ionicons.glyphMap {
    if (isMuted || volume === 0) return 'volume-mute';
    if (volume < 0.4) return 'volume-low';
    if (volume < 0.75) return 'volume-medium';
    return 'volume-high';
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={handleToggleMute} style={styles.iconBtn}>
          <Ionicons name={volumeIcon()} size={20} color="#a0a0b0" />
        </TouchableOpacity>
        {/* Web native range input for smooth dragging */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={displayVolume}
          onChange={(e) => {
            setMuted(false);
            setVolume(Number(e.target.value));
          }}
          style={{
            width: 90,
            accentColor: '#e94560',
            cursor: 'pointer',
          }}
        />
        <Text style={styles.label}>{Math.round(displayVolume * 100)}%</Text>
      </View>
    );
  }

  // Mobile fallback: tap buttons
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleToggleMute} style={styles.iconBtn}>
        <Ionicons name={volumeIcon()} size={20} color="#a0a0b0" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setVolume(Math.max(0, volume - 0.1))}
        style={styles.iconBtn}
      >
        <Ionicons name="remove" size={16} color="#a0a0b0" />
      </TouchableOpacity>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${displayVolume * 100}%` as any }]} />
      </View>
      <TouchableOpacity
        onPress={() => setVolume(Math.min(1, volume + 0.1))}
        style={styles.iconBtn}
      >
        <Ionicons name="add" size={16} color="#a0a0b0" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  iconBtn: { padding: 4 },
  label: { color: '#a0a0b0', fontSize: 11, width: 32 },
  barTrack: {
    width: 80,
    height: 4,
    backgroundColor: '#3a3a5c',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: 2,
  },
});

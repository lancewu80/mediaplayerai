import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settingsStore';
import { EQPreset, EQ_PRESETS } from '../../types';
import { webEqualizer } from '../../services/audioService';

const PRESETS: EQPreset[] = ['flat', 'bass', 'pop', 'rock', 'jazz', 'classical', 'electronic', 'vocal', 'custom'];

const COLORS = {
  bg: '#16213e',
  card: '#1a1a2e',
  border: '#2a2a4a',
  accent: '#e94560',
  active: '#00d4ff',
  text: '#ffffff',
  sub: '#a0a0b0',
};

export default function Equalizer() {
  const [visible, setVisible] = useState(false);
  const { equalizer, setEQEnabled, setEQPreset, setEQBandGain } = useSettingsStore();

  function handleBandChange(index: number, gain: number) {
    setEQBandGain(index, gain);
    webEqualizer?.updateBand(index, gain);
  }

  function handlePreset(preset: EQPreset) {
    setEQPreset(preset);
    webEqualizer?.updateAllBands(
      equalizer.bands.map((b, i) => ({ ...b, gain: EQ_PRESETS[preset][i] ?? 0 }))
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={[styles.eqBtn, equalizer.enabled && styles.eqBtnActive]}
      >
        <Ionicons name="musical-notes" size={16} color={equalizer.enabled ? COLORS.active : COLORS.sub} />
        <Text style={[styles.eqBtnText, equalizer.enabled && { color: COLORS.active }]}>EQ</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Equalizer</Text>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  onPress={() => setEQEnabled(!equalizer.enabled)}
                  style={[styles.toggleBtn, equalizer.enabled && styles.toggleBtnOn]}
                >
                  <Text style={styles.toggleText}>{equalizer.enabled ? 'ON' : 'OFF'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <Ionicons name="close" size={22} color={COLORS.sub} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => handlePreset(p)}
                  style={[styles.presetBtn, equalizer.preset === p && styles.presetBtnActive]}
                >
                  <Text style={[styles.presetText, equalizer.preset === p && { color: COLORS.accent }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Band sliders */}
            <View style={styles.bandsContainer}>
              {equalizer.bands.map((band, i) => (
                <View key={band.frequency} style={styles.bandCol}>
                  <Text style={styles.bandGain}>
                    {band.gain > 0 ? '+' : ''}{Math.round(band.gain)}
                  </Text>

                  {Platform.OS === 'web' ? (
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={0.5}
                      value={band.gain}
                      onChange={(e) => handleBandChange(i, Number(e.target.value))}
                      style={{
                        writingMode: 'vertical-lr' as any,
                        direction: 'rtl' as any,
                        height: 100,
                        accentColor: '#e94560',
                        cursor: 'pointer',
                      }}
                    />
                  ) : (
                    <View style={styles.mobileBand}>
                      <TouchableOpacity onPress={() => handleBandChange(i, Math.min(12, band.gain + 1))}>
                        <Ionicons name="add" size={14} color={COLORS.sub} />
                      </TouchableOpacity>
                      <View style={styles.mobileBandBar}>
                        <View style={[
                          styles.mobileBandFill,
                          { height: `${((band.gain + 12) / 24) * 100}%` as any }
                        ]} />
                      </View>
                      <TouchableOpacity onPress={() => handleBandChange(i, Math.max(-12, band.gain - 1))}>
                        <Ionicons name="remove" size={14} color={COLORS.sub} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.bandLabel}>{band.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  eqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3a3a5c',
    gap: 4,
  },
  eqBtnActive: { borderColor: COLORS.active },
  eqBtnText: { color: COLORS.sub, fontSize: 12, fontWeight: '600' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    width: 480,
    maxWidth: '95%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#3a3a5c',
  },
  toggleBtnOn: { backgroundColor: COLORS.accent },
  toggleText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  presetsRow: { marginBottom: 16 },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  presetBtnActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  presetText: { color: COLORS.sub, fontSize: 12 },
  bandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  bandCol: { alignItems: 'center', flex: 1 },
  bandGain: { color: COLORS.accent, fontSize: 10, marginBottom: 4, height: 14 },
  bandLabel: { color: COLORS.sub, fontSize: 9, marginTop: 4, textAlign: 'center' },
  mobileBand: { alignItems: 'center', height: 100 },
  mobileBandBar: {
    width: 6,
    height: 70,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  mobileBandFill: { width: '100%', backgroundColor: COLORS.accent },
});

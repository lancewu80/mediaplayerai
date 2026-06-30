import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '../../store/videoStore';
import { usePlayerStore } from '../../store/playerStore';
import { discoverDevices, startCasting, stopCasting, CastDevice } from '../../services/castService';
import { AudioTrack } from '../../types/video';

const COLORS = {
  card: '#1a1a2e', border: '#2a2a4a',
  accent: '#e94560', active: '#00d4ff',
  text: '#ffffff', sub: '#a0a0b0',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onAudioTrackChange?: (id: number | string) => void;
}

export default function AudioTrackMenu({ visible, onClose, onAudioTrackChange }: Props) {
  const {
    audioTracks, activeAudioTrackId, setActiveAudioTrack,
    isCasting, castDeviceName, setCasting,
  } = useVideoStore();
  const { currentItem } = usePlayerStore();

  const [castDevices, setCastDevices] = useState<CastDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  async function handleScanDevices() {
    setScanning(true); setCastError(null);
    const devices = await discoverDevices();
    setCastDevices(devices);
    if (!devices.length) setCastError('No Chromecast devices found on local network.');
    setScanning(false);
  }

  async function handleCast(device: CastDevice) {
    if (!currentItem) return;
    try {
      await startCasting(device, currentItem.uri, currentItem.title);
      setCasting(true, device.name);
    } catch (e: any) {
      setCastError(e.message);
    }
  }

  async function handleStopCast() {
    await stopCasting();
    setCasting(false, null);
  }

  function handleSelectAudio(track: AudioTrack) {
    setActiveAudioTrack(track.id);
    onAudioTrackChange?.(track.id);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Audio & Cast</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Audio tracks */}
            <Text style={styles.sectionTitle}>Audio Track</Text>
            {audioTracks.length === 0 ? (
              <Text style={styles.emptyText}>No additional audio tracks detected</Text>
            ) : (
              audioTracks.map((track) => (
                <TouchableOpacity
                  key={String(track.id)}
                  onPress={() => handleSelectAudio(track)}
                  style={[
                    styles.trackItem,
                    activeAudioTrackId === track.id && styles.trackItemActive,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.trackName,
                      activeAudioTrackId === track.id && { color: COLORS.accent },
                    ]}>
                      {track.name || `Track ${track.id}`}
                    </Text>
                    <Text style={styles.trackMeta}>
                      {[track.language, track.codec, track.channels && `${track.channels}ch`]
                        .filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {activeAudioTrackId === track.id && (
                    <Ionicons name="volume-high" size={16} color={COLORS.accent} />
                  )}
                </TouchableOpacity>
              ))
            )}

            {/* Chromecast */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Chromecast</Text>

            {isCasting ? (
              <View style={styles.castingBadge}>
                <Ionicons name="cast" size={18} color={COLORS.active} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.castingText}>Casting to {castDeviceName}</Text>
                </View>
                <TouchableOpacity onPress={handleStopCast} style={styles.stopCastBtn}>
                  <Text style={styles.stopCastText}>Stop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleScanDevices}
                  disabled={scanning}
                  style={styles.scanBtn}
                >
                  {scanning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cast" size={16} color="#fff" />
                      <Text style={styles.scanBtnText}>Scan for Cast Devices</Text>
                    </>
                  )}
                </TouchableOpacity>

                {castError && <Text style={styles.castError}>{castError}</Text>}

                {castDevices.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => handleCast(d)}
                    style={styles.deviceItem}
                  >
                    <Ionicons name="tv" size={18} color={COLORS.active} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceName}>{d.name}</Text>
                      {d.model && <Text style={styles.deviceModel}>{d.model}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
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
    padding: 20, maxHeight: '75%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { color: COLORS.sub, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  emptyText: { color: COLORS.sub, fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  trackItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, backgroundColor: '#0f0f2a', marginBottom: 6,
  },
  trackItemActive: { backgroundColor: 'rgba(233,69,96,0.12)', borderWidth: 1, borderColor: COLORS.accent },
  trackName: { color: '#fff', fontSize: 13 },
  trackMeta: { color: COLORS.sub, fontSize: 11, marginTop: 2 },
  castingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderWidth: 1, borderColor: COLORS.active,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  castingText: { color: COLORS.active, fontSize: 13, fontWeight: '600' },
  stopCastBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: COLORS.accent,
  },
  stopCastText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 10,
    paddingVertical: 12, marginBottom: 12,
  },
  scanBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  castError: { color: '#ff6b6b', fontSize: 13, marginBottom: 10 },
  deviceItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 10, backgroundColor: '#0f0f2a', marginBottom: 6,
  },
  deviceName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deviceModel: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
});

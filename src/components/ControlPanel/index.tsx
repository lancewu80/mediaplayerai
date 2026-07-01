import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeStore } from '../../store/themeStore';
import { useLangStore } from '../../store/langStore';
import { getTheme } from '../../theme';
import PlayerControls from './PlayerControls';
import VolumeControl from './VolumeControl';
import Equalizer from './Equalizer';
import AIInfoPanel from '../AIPanel/AIInfoPanel';
import AISettingsModal from '../AIPanel/AISettingsModal';
import { webEqualizer } from '../../services/audioService';

export default function ControlPanel() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Mobile: expo-av Sound object (loaded lazily to avoid static import crash)
  const soundRef = useRef<any>(null);
  const {
    currentItem, isPlaying, volume, isMuted,
    setPlaying, setPosition, setDuration, playMode,
  } = usePlayerStore();
  const { getNextItem } = usePlaylistStore();
  const { currentIndex } = usePlayerStore();
  const { equalizer, ai } = useSettingsStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const { t, toggle: toggleLang } = useLangStore();
  const C = getTheme(isDark);

  const [aiSettingsVisible, setAISettingsVisible] = useState(false);
  const [aiPanelOpen, setAIPanelOpen] = useState(false);

  // ── Web Audio element management ───────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.ontimeupdate = () => {
        setPosition(audioRef.current?.currentTime ?? 0);
      };
      audioRef.current.ondurationchange = () => {
        setDuration(audioRef.current?.duration ?? 0);
      };
      audioRef.current.onended = () => {
        // Read fresh state from stores — avoid stale-closure bugs.
        const { currentIndex: idx, playMode: mode } = usePlayerStore.getState();
        const { getNextItem: getNext, activePlaylist } = usePlaylistStore.getState();
        const items = activePlaylist?.items ?? [];

        // repeat-one: restart the same track
        if (mode === 'repeat-one') {
          const audio = audioRef.current;
          if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
          return;
        }

        // sequential: stop after the last track
        if (mode === 'sequential' && idx >= items.length - 1) {
          usePlayerStore.getState().setPlaying(false);
          return;
        }

        // repeat-all / shuffle: advance to next (wraps around)
        const next = getNext(idx, mode === 'shuffle');
        if (next) usePlayerStore.getState().setCurrentItem(next.item, next.index);
        else      usePlayerStore.getState().setPlaying(false);
      };
    }

    return () => { audioRef.current?.pause(); };
  }, []);

  // ── Load new track ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !audioRef.current) return;

    // Switched to video (or no item) — stop the audio element immediately so
    // MP3 doesn't keep playing in the background while the video plays.
    if (!currentItem || currentItem.type !== 'audio') {
      audioRef.current.pause();
      audioRef.current.src = '';
      return;
    }

    webEqualizer?.disconnect();
    audioRef.current.src = currentItem.uri;
    audioRef.current.load();
    audioRef.current.play().catch(() => {});

    if (equalizer.enabled) {
      webEqualizer?.connect(audioRef.current, equalizer.bands);
    }
  }, [currentItem]);

  // ── Play / pause ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !audioRef.current) return;
    // Video items are controlled by VideoPlayerWindow; don't touch the audio element.
    if (currentItem?.type === 'video') return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentItem]);

  // ── Volume ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ── EQ ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' || !audioRef.current) return;
    if (equalizer.enabled) {
      if (!webEqualizer?.isConnected) {
        webEqualizer?.connect(audioRef.current, equalizer.bands);
      } else {
        webEqualizer?.updateAllBands(equalizer.bands);
      }
    } else {
      webEqualizer?.disconnect();
    }
  }, [equalizer]);

  // ── Mobile: load & play new track via expo-av ─────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    async function loadAndPlay() {
      try {
        const { Audio } = await import('expo-av');

        // Enable audio playback in silent mode on iOS
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        // Unload previous sound
        if (soundRef.current) {
          await soundRef.current.stopAsync().catch(() => {});
          await soundRef.current.unloadAsync().catch(() => {});
          soundRef.current = null;
        }

        if (!currentItem || currentItem.type !== 'audio') return;

        const { sound } = await Audio.Sound.createAsync(
          { uri: currentItem.uri },
          { shouldPlay: true, volume: isMuted ? 0 : volume },
          (status: any) => {
            if (!status.isLoaded) return;
            setPosition(status.positionMillis / 1000);
            if (status.durationMillis) setDuration(status.durationMillis / 1000);
            if (status.didJustFinish) {
              // Advance to next track
              const { currentIndex: idx, playMode: mode } = usePlayerStore.getState();
              const { getNextItem: getNext, activePlaylist } = usePlaylistStore.getState();
              const items = activePlaylist?.items ?? [];
              if (mode === 'repeat-one') {
                sound.replayAsync().catch(() => {});
                return;
              }
              if (mode === 'sequential' && idx >= items.length - 1) {
                usePlayerStore.getState().setPlaying(false);
                return;
              }
              const next = getNext(idx, mode === 'shuffle');
              if (next) usePlayerStore.getState().setCurrentItem(next.item, next.index);
              else usePlayerStore.getState().setPlaying(false);
            }
          }
        );
        soundRef.current = sound;
      } catch (e) {
        console.error('Mobile audio load error:', e);
      }
    }

    loadAndPlay();

    return () => {
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [currentItem]);

  // ── Mobile: play / pause ──────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web' || !soundRef.current) return;
    if (currentItem?.type !== 'audio') return;
    if (isPlaying) {
      soundRef.current.playAsync().catch(() => {});
    } else {
      soundRef.current.pauseAsync().catch(() => {});
    }
  }, [isPlaying]);

  // ── Mobile: volume ────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web' || !soundRef.current) return;
    soundRef.current.setVolumeAsync(isMuted ? 0 : volume).catch(() => {});
  }, [volume, isMuted]);

  function handlePlay() {
    // For video items, trigger the video window to (re-)open
    if (currentItem?.type === 'video') {
      usePlayerStore.getState().openVideo();
    } else {
      setPlaying(true);
    }
  }
  function handlePause() { setPlaying(false); }
  function handleSeek(pos: number) {
    if (Platform.OS === 'web' && audioRef.current) {
      audioRef.current.currentTime = pos;
    } else if (Platform.OS !== 'web' && soundRef.current) {
      soundRef.current.setPositionAsync(pos * 1000).catch(() => {});
    }
    setPosition(pos);
  }

  return (
    <View style={[styles.container, { backgroundColor: C.surface, borderBottomColor: C.border }]}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={[styles.appName, { color: C.text }]}>🎵 MediaPlayer AI</Text>

        <View style={styles.topBarRight}>
          {/* AI toggle */}
          <TouchableOpacity
            onPress={() => setAIPanelOpen(!aiPanelOpen)}
            style={[styles.topBtn, { borderColor: aiPanelOpen ? C.active : C.border },
              aiPanelOpen && { backgroundColor: 'rgba(0,212,255,0.08)' }]}
          >
            <Ionicons name="sparkles" size={15} color={aiPanelOpen ? C.active : C.sub} />
            <Text style={[styles.topBtnText, { color: aiPanelOpen ? C.active : C.sub }]}>{t('ai')}</Text>
            {ai.enabled && <View style={styles.aiDot} />}
          </TouchableOpacity>

          {/* AI settings */}
          <TouchableOpacity
            onPress={() => setAISettingsVisible(true)}
            style={[styles.topBtn, { borderColor: C.border }]}
          >
            <Ionicons name="settings-outline" size={15} color={C.sub} />
            <Text style={[styles.topBtnText, { color: C.sub }]}>{t('aiSettings')}</Text>
          </TouchableOpacity>

          {/* Theme toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.topBtn, { borderColor: C.border }]}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={15}
              color={C.sub}
            />
            <Text style={[styles.topBtnText, { color: C.sub }]}>
              {isDark ? t('light') : t('dark')}
            </Text>
          </TouchableOpacity>

          {/* Language toggle */}
          <TouchableOpacity
            onPress={toggleLang}
            style={[styles.topBtn, { borderColor: C.border }]}
          >
            <Ionicons name="language-outline" size={15} color={C.sub} />
            <Text style={[styles.topBtnText, { color: C.sub }]}>{t('switchLang')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Player controls row */}
      <View style={styles.playerRow}>
        <View style={styles.controls}>
          <PlayerControls onSeek={handleSeek} onPlay={handlePlay} onPause={handlePause} />
        </View>
        <View style={styles.sideControls}>
          <VolumeControl />
          <Equalizer />
        </View>
      </View>

      {/* AI info panel (collapsible) */}
      {aiPanelOpen && (
        <View style={[styles.aiPanel, { borderTopColor: C.border, backgroundColor: isDark ? '#0f0f24' : '#f8f9fb' }]}>
          <AIInfoPanel mediaType={currentItem?.type ?? 'audio'} />
        </View>
      )}

      <AISettingsModal visible={aiSettingsVisible} onClose={() => setAISettingsVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  appName: { fontSize: 15, fontWeight: '700' },
  topBarRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  topBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1,
  },
  topBtnText: { fontSize: 12 },
  aiDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#00cc66', marginLeft: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  controls: { flex: 1 },
  sideControls: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    paddingRight: 4,
  },
  aiPanel: {
    borderTopWidth: 1,
  },
});

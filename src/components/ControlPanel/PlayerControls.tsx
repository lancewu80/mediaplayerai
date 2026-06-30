import React from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useLangStore } from '../../store/langStore';
import { formatTime } from '../../services/audioService';
import { PlayMode } from '../../types';

const COLORS = {
  bg: '#1a1a2e',
  accent: '#e94560',
  text: '#ffffff',
  subText: '#a0a0b0',
  active: '#00d4ff',
};

interface Props {
  onSeek: (position: number) => void;
  onPlay: () => void;
  onPause: () => void;
}

export default function PlayerControls({ onSeek, onPlay, onPause }: Props) {
  const { t } = useLangStore();
  const {
    currentItem, isPlaying, position, duration, playMode,
    setPlayMode, togglePlayMode,
  } = usePlayerStore();
  const { getNextItem, getPrevItem, getFirstItem, getLastItem, setActivePlaylist } = usePlaylistStore();
  const { currentIndex } = usePlayerStore();
  const { setCurrentItem } = usePlayerStore();

  const progress = duration > 0 ? position / duration : 0;

  function handleFirst() {
    const r = getFirstItem();
    if (r) setCurrentItem(r.item, r.index);
  }
  function handleLast() {
    const r = getLastItem();
    if (r) setCurrentItem(r.item, r.index);
  }
  function handlePrev() {
    const r = getPrevItem(currentIndex);
    if (r) setCurrentItem(r.item, r.index);
  }
  function handleNext() {
    const r = getNextItem(currentIndex, playMode === 'shuffle');
    if (r) setCurrentItem(r.item, r.index);
  }
  function handleSeekBack() { onSeek(Math.max(0, position - 10)); }
  function handleSeekForward() { onSeek(Math.min(duration, position + 10)); }

  function playModeIcon(): keyof typeof Ionicons.glyphMap {
    switch (playMode) {
      case 'shuffle': return 'shuffle';
      case 'repeat-one': return 'repeat-outline';
      case 'repeat-all': return 'repeat';
      default: return 'list';
    }
  }

  return (
    <View style={styles.container}>
      {/* Song title */}
      <Text style={styles.title} numberOfLines={1}>
        {currentItem ? currentItem.title : t('noTrack')}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {currentItem?.artist ?? ''}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <Text style={styles.time}>{formatTime(position)}</Text>
        <View
          style={styles.progressTrack}
          // @ts-ignore
          onClick={(e: any) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            onSeek(ratio * duration);
          }}
        >
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      {/* Main controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={handleFirst} style={styles.btn}>
          <Ionicons name="play-skip-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePrev} style={styles.btn}>
          <Ionicons name="play-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSeekBack} style={styles.btn}>
          <Ionicons name="play-back-outline" size={18} color={COLORS.subText} />
          <Text style={styles.seekLabel}>10</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isPlaying ? onPause : onPlay}
          style={styles.playBtn}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color={COLORS.bg}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSeekForward} style={styles.btn}>
          <Text style={styles.seekLabel}>10</Text>
          <Ionicons name="play-forward-outline" size={18} color={COLORS.subText} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} style={styles.btn}>
          <Ionicons name="play-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLast} style={styles.btn}>
          <Ionicons name="play-skip-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {/* Play mode */}
        <TouchableOpacity onPress={togglePlayMode} style={styles.btn}>
          <Ionicons
            name={playModeIcon()}
            size={20}
            color={playMode !== 'sequential' ? COLORS.active : COLORS.subText}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  artist: {
    color: '#a0a0b0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  time: {
    color: '#a0a0b0',
    fontSize: 11,
    width: 38,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#3a3a5c',
    borderRadius: 2,
    overflow: 'hidden',
    cursor: 'pointer' as any,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btn: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e94560',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  seekLabel: {
    color: '#a0a0b0',
    fontSize: 10,
  },
});

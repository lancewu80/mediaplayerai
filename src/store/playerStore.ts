import { create } from 'zustand';
import { MediaItem, PlayMode, PlayerState } from '../types';

interface PlayerStore extends PlayerState {
  playTrigger: number;          // increments every time we want to (re-)open the player
  setCurrentItem: (item: MediaItem | null, index: number) => void;
  openVideo: () => void;        // open video window for the current item without resetting position
  setPlaying: (playing: boolean) => void;
  setPosition: (pos: number) => void;
  setDuration: (dur: number) => void;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  setPlayMode: (mode: PlayMode) => void;
  togglePlayMode: () => void;
  toggleShuffle: () => void;
}

const PLAY_MODE_CYCLE: PlayMode[] = ['sequential', 'repeat-all', 'shuffle', 'repeat-one'];

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentItem: null,
  currentIndex: -1,
  isPlaying: false,
  isPaused: false,
  position: 0,
  duration: 0,
  volume: 0.8,
  playMode: 'sequential',
  isMuted: false,
  playTrigger: 0,

  setCurrentItem: (item, index) =>
    set((s) => ({ currentItem: item, currentIndex: index, position: 0, isPlaying: true, isPaused: false, playTrigger: s.playTrigger + 1 })),

  // Re-open the video window without resetting position (used by play button)
  openVideo: () =>
    set((s) => ({ isPlaying: true, isPaused: false, playTrigger: s.playTrigger + 1 })),

  setPlaying: (playing) =>
    set({ isPlaying: playing, isPaused: !playing }),

  setPosition: (pos) => set({ position: pos }),
  setDuration: (dur) => set({ duration: dur }),

  setVolume: (vol) => set({ volume: Math.max(0, Math.min(1, vol)) }),

  setMuted: (muted) => set({ isMuted: muted }),

  setPlayMode: (mode) => set({ playMode: mode }),

  togglePlayMode: () => {
    const current = get().playMode;
    const idx = PLAY_MODE_CYCLE.indexOf(current);
    const next = PLAY_MODE_CYCLE[(idx + 1) % PLAY_MODE_CYCLE.length];
    set({ playMode: next });
  },

  toggleShuffle: () => {
    const current = get().playMode;
    if (current === 'shuffle') {
      set({ playMode: 'sequential' });
    } else {
      set({ playMode: 'shuffle' });
    }
  },
}));

import { create } from 'zustand';
import {
  VideoState, DEFAULT_VIDEO_STATE,
  AspectRatio, AudioTrack, SubtitleTrack, SubtitleStyle,
} from '../types/video';

interface VideoStore extends VideoState {
  setAspectRatio: (r: AspectRatio) => void;
  setAudioTracks: (tracks: AudioTrack[]) => void;
  setActiveAudioTrack: (id: number | string | null) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setActiveSubtitleTrack: (id: number | string | null) => void;
  addExternalSubtitle: (track: SubtitleTrack) => void;
  setSubtitleOffset: (ms: number) => void;
  updateSubtitleStyle: (patch: Partial<SubtitleStyle>) => void;
  setScreenLocked: (v: boolean) => void;
  setKeepAwake: (v: boolean) => void;
  setCasting: (casting: boolean, deviceName?: string | null) => void;
  setPlaybackRate: (rate: number) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  ...DEFAULT_VIDEO_STATE,

  setAspectRatio: (aspectRatio) => set({ aspectRatio }),

  setAudioTracks: (audioTracks) => set({ audioTracks }),
  setActiveAudioTrack: (activeAudioTrackId) => set({ activeAudioTrackId }),

  setSubtitleTracks: (subtitleTracks) => set({ subtitleTracks }),
  setActiveSubtitleTrack: (activeSubtitleTrackId) => set({ activeSubtitleTrackId }),

  addExternalSubtitle: (track) =>
    set((s) => ({ subtitleTracks: [...s.subtitleTracks, track] })),

  setSubtitleOffset: (subtitleOffset) => set({ subtitleOffset }),

  updateSubtitleStyle: (patch) =>
    set((s) => ({ subtitleStyle: { ...s.subtitleStyle, ...patch } })),

  setScreenLocked: (screenLocked) => set({ screenLocked }),
  setKeepAwake: (keepAwake) => set({ keepAwake }),

  setCasting: (isCasting, castDeviceName = null) =>
    set({ isCasting, castDeviceName }),

  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  reset: () => set({ ...DEFAULT_VIDEO_STATE }),
}));

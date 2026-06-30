/**
 * VLC / MPV abstraction layer
 *
 * Platform routing:
 *   iOS / Android  → react-native-vlc-media-player  (hardware-decoded VLC)
 *   Electron       → mpv child-process via IPC      (full libmpv)
 *   Web browser    → HTML5 <video> fallback          (limited codecs)
 *
 * The interface intentionally mirrors the VLC component props so that
 * upper components stay platform-agnostic.
 */

import { Platform } from 'react-native';

// ─── Supported format lists ───────────────────────────────────────────────────

/** VLC-supported video containers */
export const VLC_VIDEO_FORMATS = [
  // Mainstream
  'mp4', 'm4v', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm',
  // MPEG family
  'mpg', 'mpeg', 'ts', 'mts', 'm2ts', 'tp', 'trp', 'vob', 'ifo',
  // Other
  'ogv', 'ogx', 'rmvb', 'rm', '3gp', '3g2', 'f4v', 'asf', 'divx',
  'xvid', 'hevc', 'h265', 'h264', 'dv', 'nsv', 'nuv', 'qt',
];

/** VLC-supported audio containers */
export const VLC_AUDIO_FORMATS = [
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'oga', 'wma', 'opus',
  'aiff', 'aif', 'alac', 'ape', 'mid', 'midi', 'mka', 'mpa',
  'ra', 'ram', 'au', 'amr', 'spx', 'wv', 'mp2',
];

export const ALL_VLC_FORMATS = [...VLC_VIDEO_FORMATS, ...VLC_AUDIO_FORMATS];

export function isVLCVideoFormat(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return VLC_VIDEO_FORMATS.includes(ext);
}

// ─── Platform detection ───────────────────────────────────────────────────────

export type PlayerBackend = 'vlc-native' | 'mpv-electron' | 'html5';

export function getPlayerBackend(): PlayerBackend {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return 'vlc-native';
  // Electron: use Chromium's built-in HTML5 player.
  // MPV --wid embedding inside a web renderer context (BrowserWindow loading a web app)
  // does not reliably work — the video surface conflicts with the web compositor.
  // Electron's Chromium natively supports H.264/AAC and VP9/Opus, covering all
  // YouTube downloads and the vast majority of common video files.
  return 'html5';
}

// ─── MPV Electron IPC bridge ──────────────────────────────────────────────────

export interface MPVStatus {
  position: number;        // seconds
  duration: number;        // seconds
  paused: boolean;
  volume: number;          // 0–100
  audioTracks: MPVTrack[];
  subtitleTracks: MPVTrack[];
  videoWidth: number;
  videoHeight: number;
  chapter: number;
  speed: number;
}

export interface MPVTrack {
  id: number;
  type: 'audio' | 'sub' | 'video';
  title?: string;
  lang?: string;
  codec?: string;
  default?: boolean;
  forced?: boolean;
  external?: boolean;
  externalFilename?: string;
  channels?: number;
  samplerate?: number;
}

const api = () => (window as any).electronAPI as any;

export const mpv = {
  async open(uri: string): Promise<void> {
    return api().mpvCommand('loadfile', [uri]);
  },
  async play(): Promise<void> {
    return api().mpvCommand('set_property', ['pause', false]);
  },
  async pause(): Promise<void> {
    return api().mpvCommand('set_property', ['pause', true]);
  },
  async seek(seconds: number): Promise<void> {
    return api().mpvCommand('seek', [seconds, 'absolute']);
  },
  async setVolume(vol: number): Promise<void> {
    return api().mpvCommand('set_property', ['volume', Math.round(vol * 100)]);
  },
  async setSpeed(rate: number): Promise<void> {
    return api().mpvCommand('set_property', ['speed', rate]);
  },
  async setAudioTrack(id: number): Promise<void> {
    return api().mpvCommand('set_property', ['aid', id]);
  },
  async setSubtitleTrack(id: number | 'no'): Promise<void> {
    return api().mpvCommand('set_property', ['sid', id]);
  },
  async setSubtitleFile(path: string): Promise<void> {
    return api().mpvCommand('sub-add', [path, 'select']);
  },
  async setSubtitleDelay(seconds: number): Promise<void> {
    return api().mpvCommand('set_property', ['sub-delay', seconds]);
  },
  async setAspectRatio(ratio: string): Promise<void> {
    return api().mpvCommand('set_property', ['video-aspect-override', ratio]);
  },
  async setVideoFilter(filter: string): Promise<void> {
    return api().mpvCommand('vf', ['set', filter]);
  },
  async getStatus(): Promise<MPVStatus> {
    return api().mpvGetStatus();
  },
  onStatus(cb: (s: MPVStatus) => void): () => void {
    return api().mpvOnStatus(cb);
  },
};

// ─── VLC Native bridge helper (mobile) ───────────────────────────────────────

/**
 * Maps our AspectRatio type to VLC-compatible strings.
 * react-native-vlc-media-player uses these directly.
 */
export function toVLCAspectRatio(ratio: string): string {
  switch (ratio) {
    case 'fit':      return '0';   // VLC default (letterbox)
    case 'fill':     return '2';   // crop fill
    case 'stretch':  return '6';   // stretch
    case '16:9':     return '16:9';
    case '4:3':      return '4:3';
    case '1:1':      return '1:1';
    case '21:9':     return '21:9';
    case 'original': return '0';
    default:         return '0';
  }
}

/**
 * Maps our AspectRatio type to CSS object-fit values (HTML5/web fallback).
 */
export function toCSSObjectFit(ratio: string): string {
  switch (ratio) {
    case 'fill': return 'cover';
    case 'stretch': return 'fill';
    default: return 'contain';
  }
}

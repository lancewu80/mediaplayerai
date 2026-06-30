/**
 * Audio service — wraps Howler.js for web/Electron, expo-av for mobile.
 * Provides a unified interface regardless of platform.
 */
import { Platform } from 'react-native';
import { EQBand } from '../types';

// ─── Web Audio Equalizer ──────────────────────────────────────────────────────

class WebEqualizer {
  private context: AudioContext | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private element: HTMLAudioElement | null = null;

  connect(element: HTMLAudioElement, bands: EQBand[]) {
    if (this.context) this.disconnect();

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.element = element;
    this.gainNode = this.context.createGain();

    this.filters = bands.map((band) => {
      const filter = this.context!.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = 1.0;
      return filter;
    });

    this.sourceNode = this.context.createMediaElementSource(element);

    let current: AudioNode = this.sourceNode;
    for (const f of this.filters) {
      current.connect(f);
      current = f;
    }
    current.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
  }

  updateBand(index: number, gain: number) {
    if (this.filters[index]) {
      this.filters[index].gain.value = gain;
    }
  }

  updateAllBands(bands: EQBand[]) {
    bands.forEach((band, i) => this.updateBand(i, band.gain));
  }

  setGain(value: number) {
    if (this.gainNode) this.gainNode.gain.value = value;
  }

  disconnect() {
    this.filters.forEach((f) => f.disconnect());
    this.sourceNode?.disconnect();
    this.gainNode?.disconnect();
    this.context?.close();
    this.context = null;
    this.filters = [];
    this.sourceNode = null;
    this.gainNode = null;
  }

  get isConnected() {
    return this.context !== null;
  }
}

export const webEqualizer = Platform.OS === 'web' ? new WebEqualizer() : null;

// ─── Format detection ─────────────────────────────────────────────────────────

export function getFileExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

export function isAudioFile(path: string): boolean {
  const ext = getFileExtension(path);
  return [
    'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma',
    'opus', 'aiff', 'alac', 'ape', 'mid', 'midi', 'amr',
  ].includes(ext);
}

export function isVideoFile(path: string): boolean {
  const ext = getFileExtension(path);
  return [
    'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm',
    'mpg', 'mpeg', 'm4v', '3gp', 'ts', 'mts', 'vob', 'rmvb',
  ].includes(ext);
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Title parsing ────────────────────────────────────────────────────────────

export function parseTitleFromFilename(path: string): { title: string; artist?: string } {
  const filename = path.split(/[\\/]/).pop() ?? '';
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  // Try "Artist - Title" pattern
  const match = withoutExt.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (match) return { artist: match[1].trim(), title: match[2].trim() };
  return { title: withoutExt };
}

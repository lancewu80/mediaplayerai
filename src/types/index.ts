// ─── Media Types ────────────────────────────────────────────────────────────

export type MediaType = 'audio' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;        // seconds
  path: string;
  uri: string;
  type: MediaType;
  thumbnail?: string;
  year?: number;
  genre?: string;
  addedAt: number;
}

// ─── Playlist ────────────────────────────────────────────────────────────────

export interface Playlist {
  id: string;
  name: string;
  items: MediaItem[];
  createdAt: number;
  updatedAt: number;
}

// ─── Player State ─────────────────────────────────────────────────────────────

export type PlayMode = 'sequential' | 'shuffle' | 'repeat-one' | 'repeat-all';

export interface PlayerState {
  currentItem: MediaItem | null;
  currentIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  position: number;         // seconds
  duration: number;         // seconds
  volume: number;           // 0–1
  playMode: PlayMode;
  isMuted: boolean;
}

// ─── Equalizer ────────────────────────────────────────────────────────────────

export type EQPreset =
  | 'flat'
  | 'bass'
  | 'pop'
  | 'rock'
  | 'jazz'
  | 'classical'
  | 'electronic'
  | 'vocal'
  | 'custom';

export interface EQBand {
  frequency: number;        // Hz
  gain: number;             // dB  -12 ~ +12
  label: string;
}

export interface EqualizerState {
  preset: EQPreset;
  bands: EQBand[];
  enabled: boolean;
}

export const DEFAULT_EQ_BANDS: EQBand[] = [
  { frequency: 60,   gain: 0, label: '60Hz'  },
  { frequency: 170,  gain: 0, label: '170Hz' },
  { frequency: 310,  gain: 0, label: '310Hz' },
  { frequency: 600,  gain: 0, label: '600Hz' },
  { frequency: 1000, gain: 0, label: '1kHz'  },
  { frequency: 3000, gain: 0, label: '3kHz'  },
  { frequency: 6000, gain: 0, label: '6kHz'  },
  { frequency: 12000,gain: 0, label: '12kHz' },
  { frequency: 14000,gain: 0, label: '14kHz' },
  { frequency: 16000,gain: 0, label: '16kHz' },
];

export const EQ_PRESETS: Record<EQPreset, number[]> = {
  flat:        [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  bass:        [ 8,  7,  5,  2,  0, -1, -1,  0,  0,  0],
  pop:         [-1,  2,  4,  4,  1, -1, -1, -1,  0,  0],
  rock:        [ 5,  3,  0, -2, -1,  2,  4,  5,  5,  5],
  jazz:        [ 3,  2,  1,  2, -1, -1,  0,  1,  2,  3],
  classical:   [ 4,  3,  2,  0,  0,  0, -1, -2, -2, -2],
  electronic:  [ 5,  4,  2,  0, -1,  2,  2,  4,  4,  5],
  vocal:       [-2, -2,  0,  3,  4,  4,  3,  1,  0, -1],
  custom:      [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
};

// ─── AI Settings ──────────────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'openai' | 'deepseek' | 'gemini';

export interface AIModelConfig {
  audioModels: string[];
  videoModels: string[];
  customModel: string;
  selectedAudioModel: string;
  selectedVideoModel: string;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  enabled: boolean;
  models: AIModelConfig;
}

export interface AISettings {
  enabled: boolean;
  activeProvider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
}

export const DEFAULT_AI_MODELS: Record<AIProvider, AIModelConfig> = {
  claude: {
    audioModels: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    videoModels: ['claude-opus-4-8', 'claude-sonnet-4-6'],
    customModel: '',
    selectedAudioModel: 'claude-sonnet-4-6',
    selectedVideoModel: 'claude-sonnet-4-6',
  },
  openai: {
    audioModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'whisper-1'],
    videoModels: ['gpt-4o', 'gpt-4-turbo'],
    customModel: '',
    selectedAudioModel: 'gpt-4o',
    selectedVideoModel: 'gpt-4o',
  },
  deepseek: {
    audioModels: ['deepseek-chat', 'deepseek-reasoner'],
    videoModels: ['deepseek-chat'],
    customModel: '',
    selectedAudioModel: 'deepseek-chat',
    selectedVideoModel: 'deepseek-chat',
  },
  gemini: {
    audioModels: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    videoModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    customModel: '',
    selectedAudioModel: 'gemini-1.5-pro',
    selectedVideoModel: 'gemini-1.5-pro',
  },
};

// ─── AI Results ───────────────────────────────────────────────────────────────

export interface SongInfo {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  duration?: string;
  description?: string;
  language?: string;
}

export interface VideoInfo {
  title?: string;
  director?: string;
  year?: string;
  cast?: string[];
  summary?: string;
  genre?: string;
  rating?: string;
  duration?: string;
}

export interface LyricsResult {
  lyrics: string;
  source?: string;
  language?: string;
}

export interface RecognitionResult {
  title: string;
  artist: string;
  album?: string;
  confidence?: number;
  source?: string;
}

// ─── Supported Formats ────────────────────────────────────────────────────────

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma',
  'opus', 'aiff', 'alac', 'ape', 'mid', 'midi', 'amr',
];

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm',
  'mpg', 'mpeg', 'm4v', '3gp', 'ts', 'mts', 'vob', 'rmvb',
];

export const ALL_SUPPORTED_FORMATS = [
  ...SUPPORTED_AUDIO_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS,
];

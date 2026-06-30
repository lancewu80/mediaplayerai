// ─── Extended Video Types ─────────────────────────────────────────────────────

export type AspectRatio =
  | 'fit'       // letterbox / pillarbox to fit
  | 'fill'      // crop to fill
  | 'stretch'   // stretch to fill
  | '16:9'
  | '4:3'
  | '1:1'
  | '21:9'
  | 'original'; // native source ratio

export interface AudioTrack {
  id: number | string;
  name: string;
  language?: string;
  codec?: string;
  channels?: number;
  sampleRate?: number;
  isDefault?: boolean;
}

export interface SubtitleTrack {
  id: number | string;
  name: string;
  language?: string;
  format?: 'srt' | 'ass' | 'vtt' | 'embedded';
  isDefault?: boolean;
  isExternal?: boolean;
  uri?: string;
}

export interface SubtitleStyle {
  fontSize: number;        // 12–40
  color: string;           // hex
  backgroundColor: string; // hex with alpha
  bold: boolean;
  outline: boolean;
  position: 'bottom' | 'top';
  offsetY: number;         // px offset from edge
}

export interface SubtitleCue {
  start: number;   // ms
  end: number;     // ms
  text: string;
}

export interface OnlineSubtitle {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  downloadUrl: string;
  rating?: number;
  uploader?: string;
  uploadDate?: string;
  hearingImpaired?: boolean;
}

export interface VideoState {
  aspectRatio: AspectRatio;
  audioTracks: AudioTrack[];
  activeAudioTrackId: number | string | null;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleTrackId: number | string | null;
  subtitleOffset: number;        // ms — positive = delay, negative = advance
  subtitleStyle: SubtitleStyle;
  screenLocked: boolean;
  keepAwake: boolean;
  isCasting: boolean;
  castDeviceName: string | null;
  playbackRate: number;          // 0.25 – 2.0
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 18,
  color: '#ffffff',
  backgroundColor: 'rgba(0,0,0,0.6)',
  bold: false,
  outline: true,
  position: 'bottom',
  offsetY: 24,
};

export const DEFAULT_VIDEO_STATE: VideoState = {
  aspectRatio: 'fit',
  audioTracks: [],
  activeAudioTrackId: null,
  subtitleTracks: [],
  activeSubtitleTrackId: null,
  subtitleOffset: 0,
  subtitleStyle: DEFAULT_SUBTITLE_STYLE,
  screenLocked: false,
  keepAwake: true,
  isCasting: false,
  castDeviceName: null,
  playbackRate: 1.0,
};

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: 'fit',      label: 'Fit (Letterbox)' },
  { value: 'fill',     label: 'Fill (Crop)'     },
  { value: 'stretch',  label: 'Stretch'          },
  { value: '16:9',     label: '16:9'             },
  { value: '4:3',      label: '4:3'              },
  { value: '1:1',      label: '1:1'              },
  { value: '21:9',     label: '21:9 (Cinema)'   },
  { value: 'original', label: 'Original'         },
];

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

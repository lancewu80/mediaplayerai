# MediaPlayer AI — Setup Guide

## Tech Stack
- **React + TypeScript** — UI framework
- **Expo** (SDK 51) — iOS / Android / Web
- **Electron** — Windows / macOS desktop
- **Zustand** — State management
- **Web Audio API** — 10-band equalizer (web/Electron)
- **expo-av** — Audio/video on mobile

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Run on each platform

| Platform | Command |
|---|---|
| Web (browser) | `npm run web` |
| Android | `npm run android` |
| iOS | `npm run ios` |
| Windows/macOS (Electron dev) | `npm run electron:dev` |
| Build Electron installer | `npm run build:electron` |

---

## Features

### Audio Player
- Formats: MP3, WAV, FLAC, AAC, M4A, OGG, WMA, OPUS, AIFF, APE, MIDI, AMR
- Controls: First / Prev / -10s / Play-Pause / +10s / Next / Last
- Playback modes: Sequential, Repeat-All, Shuffle, Repeat-One
- 10-band parametric equalizer with presets: Flat, Bass, Pop, Rock, Jazz, Classical, Electronic, Vocal, Custom

### Video Player — VLC / MPV powered
| Platform | Engine | Formats |
|---|---|---|
| iOS / Android | **react-native-vlc-media-player** (libVLC) | All formats |
| Windows / macOS | **mpv** child-process via IPC | All formats + 4K HDR |
| Browser (fallback) | HTML5 `<video>` | Limited |

- All containers: MKV, AVI, MP4, M4V, MOV, RMVB, TS, VOB, 3GP, FLV, WebM, HEVC, …
- Separate modal window with same transport controls
- Right-click context menu: Fullscreen, Play/Pause, Subtitles, Audio Track, AI Info, Close
- In fullscreen: mouse move shows controls, mouse leaves hides them (3.5 s auto-hide)

### Subtitles
- Embedded subtitle tracks (from MKV etc.)
- Load local SRT / ASS / VTT file
- **Online search via OpenSubtitles.com** (8 languages, hearing-impaired flag)
- Timing offset: ±0.1 s / ±0.5 s adjustment
- Style panel: font size, bold, outline, position (top/bottom), color

### Audio Tracks
- Switch embedded audio tracks (e.g. original language / dubbed)
- Shows codec, channels, language metadata

### Aspect Ratio & Playback
- Fit / Fill / Stretch / 16:9 / 4:3 / 1:1 / 21:9 / Original
- Playback speed: 0.25× – 2.0×
- Keep screen awake toggle
- Portrait lock / auto-rotate (mobile)

### Chromecast
- Scan local network for Cast devices
- Cast current video URI to TV
- Stop casting

### Playlist
- Add individual files or scan a whole directory (recursive)
- Double-click (or double-tap) any item to play it
- Drag-to-reorder (long-press on mobile)
- Export/Import playlists as JSON

### AI Integration
- **Providers**: Claude (Anthropic), OpenAI, DeepSeek, Gemini
- Per-provider: API key, enable/disable, audio model, video model, custom model override
- **Test Connection** button to verify key before saving
- Features:
  - 🎵 **Song Info** — title, artist, album, year, genre, description
  - 📄 **Lyrics Search** — full lyrics with AI
  - 🎬 **Video Info** — director, cast, year, summary, rating
  - 🎤 **Listen to Identify** — records microphone audio (8 s) → AI identification
  - 🎶 **Hum to Search** — describe the melody in text → AI matches the song

---

## Project Structure

```
mediaplayerai/
├── electron/
│   ├── main.ts          # Electron main process (file I/O, dialogs)
│   └── preload.ts       # Context bridge (electronAPI)
├── src/
│   ├── App.tsx          # Root layout (control panel + playlist)
│   ├── types/           # TypeScript types + constants
│   ├── store/           # Zustand stores
│   │   ├── playerStore.ts
│   │   ├── playlistStore.ts
│   │   └── settingsStore.ts
│   ├── services/
│   │   ├── aiService.ts          # Claude/OpenAI/DeepSeek/Gemini
│   │   ├── audioService.ts       # Web Audio EQ wrapper
│   │   ├── playlistService.ts    # File scanning, JSON import/export
│   │   └── recognitionService.ts # Mic recording + song recognition
│   └── components/
│       ├── ControlPanel/         # Player controls, EQ, volume, AI toggle
│       ├── Playlist/             # Playlist panel with toolbar
│       ├── VideoPlayer/          # Full-featured video window
│       └── AIPanel/              # AI info panel + settings modal
├── web/index.html       # Custom HTML shell for web/Electron
├── App.tsx              # Root export
├── index.ts             # Expo entry point
├── app.json             # Expo config
├── package.json
└── tsconfig.json
```

---

## AI API Keys

Set keys in the app via the **AI Settings** button in the control panel:

| Provider | Where to get key |
|---|---|
| Claude | https://console.anthropic.com |
| OpenAI | https://platform.openai.com/api-keys |
| DeepSeek | https://platform.deepseek.com |
| Gemini | https://aistudio.google.com/app/apikey |

---

## Building for Production

```bash
# Web
npm run build:web

# Electron (Windows)
npm run dist -- --win

# Electron (macOS)
npm run dist -- --mac

# Android APK (requires Expo EAS or local build)
npx eas build --platform android

# iOS IPA (requires Expo EAS + Apple account)
npx eas build --platform ios
```

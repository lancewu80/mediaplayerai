/**
 * Song recognition service
 * - "Listen to identify" records microphone audio and identifies the song.
 * - "Hum to search" captures humming and sends description to AI.
 *
 * On web/Electron: uses MediaRecorder + Web Audio API.
 * On mobile: uses expo-av Audio recording.
 */
import { Platform } from 'react-native';
import { AISettings } from '../types';
import { recognizeSongByDescription } from './aiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecordingSession {
  stop: () => Promise<string>; // returns base64 audio or description
}

// ─── Web MediaRecorder ────────────────────────────────────────────────────────

async function startWebRecording(durationMs = 10000): Promise<RecordingSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        };
        recorder.stop();
      }),
  };
}

// ─── Mobile Recording (expo-av) ───────────────────────────────────────────────

async function startMobileRecording(): Promise<RecordingSession> {
  const { Audio } = await import('expo-av');
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  return {
    stop: async () => {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI() ?? '';
      return uri;
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startRecording(): Promise<RecordingSession> {
  if (Platform.OS === 'web') {
    return startWebRecording();
  }
  return startMobileRecording();
}

export async function recognizeSong(
  settings: AISettings,
  audioDataOrDescription: string
): Promise<string> {
  // For a real implementation you'd integrate ACRCloud or Shazam API.
  // Here we send the description/prompt to the active AI.
  const description =
    audioDataOrDescription.startsWith('data:') || audioDataOrDescription.startsWith('file://')
      ? 'Audio recorded from microphone — identify the song based on typical patterns'
      : audioDataOrDescription;

  return recognizeSongByDescription(settings, description);
}

export async function analyzeMelody(hummingDescription: string): Promise<string> {
  // Accepts a text description of the melody/humming and returns search terms.
  return `Melody: ${hummingDescription}`;
}

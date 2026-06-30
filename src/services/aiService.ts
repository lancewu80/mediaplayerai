import { AIProvider, AISettings, SongInfo, VideoInfo, LyricsResult } from '../types';

// ─── Base request helpers ─────────────────────────────────────────────────────

async function claudeRequest(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function openaiRequest(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function deepseekRequest(apiKey: string, model: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function geminiRequest(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Unified call ─────────────────────────────────────────────────────────────

async function callAI(
  settings: AISettings,
  prompt: string,
  mode: 'audio' | 'video' = 'audio'
): Promise<string> {
  const { activeProvider, providers } = settings;
  const config = providers[activeProvider];
  if (!config.enabled || !config.apiKey) {
    throw new Error('AI provider not configured or disabled.');
  }
  const model =
    mode === 'video'
      ? config.models.customModel || config.models.selectedVideoModel
      : config.models.customModel || config.models.selectedAudioModel;

  switch (activeProvider) {
    case 'claude':
      return claudeRequest(config.apiKey, model, prompt);
    case 'openai':
      return openaiRequest(config.apiKey, model, prompt);
    case 'deepseek':
      return deepseekRequest(config.apiKey, model, prompt);
    case 'gemini':
      return geminiRequest(config.apiKey, model, prompt);
    default:
      throw new Error('Unknown provider');
  }
}

// ─── Parse JSON safely ────────────────────────────────────────────────────────

function parseJSON<T>(text: string): T | null {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    const raw = match ? (match[1] ?? match[0]) : text;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function querySongInfo(
  settings: AISettings,
  title: string,
  artist?: string
): Promise<SongInfo> {
  const prompt = `Please provide information about the song "${title}"${artist ? ` by "${artist}"` : ''}.
Return a JSON object with fields: title, artist, album, year, genre, duration, description, language.
Respond with JSON only, wrapped in \`\`\`json\`\`\`.`;

  const text = await callAI(settings, prompt, 'audio');
  return parseJSON<SongInfo>(text) ?? { title, artist };
}

export async function searchLyrics(
  settings: AISettings,
  title: string,
  artist?: string
): Promise<LyricsResult> {
  const prompt = `Please provide the full lyrics for the song "${title}"${artist ? ` by "${artist}"` : ''}.
Return a JSON object with fields: lyrics (full text), source (website name), language.
If you don't know the lyrics, explain why. Respond with JSON only, wrapped in \`\`\`json\`\`\`.`;

  const text = await callAI(settings, prompt, 'audio');
  const parsed = parseJSON<LyricsResult>(text);
  return parsed ?? { lyrics: text, language: 'unknown' };
}

export async function queryVideoInfo(
  settings: AISettings,
  title: string
): Promise<VideoInfo> {
  const prompt = `Please provide information about the movie or video "${title}".
Return a JSON object with fields: title, director, year, cast (array), summary, genre, rating, duration.
Respond with JSON only, wrapped in \`\`\`json\`\`\`.`;

  const text = await callAI(settings, prompt, 'video');
  return parseJSON<VideoInfo>(text) ?? { title };
}

export async function recognizeSongByDescription(
  settings: AISettings,
  description: string
): Promise<string> {
  const prompt = `Based on the following description of a song (either humming notes or audio characteristics), identify the song name and artist.
Description: "${description}"
Return: Song name - Artist name. If unsure, provide your best guess.`;
  return callAI(settings, prompt, 'audio');
}

export async function testAPIConnection(
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<boolean> {
  try {
    const testSettings: AISettings = {
      enabled: true,
      activeProvider: provider,
      providers: {
        claude: { provider: 'claude', apiKey: '', enabled: false, models: { audioModels: [], videoModels: [], customModel: '', selectedAudioModel: '', selectedVideoModel: '' } },
        openai: { provider: 'openai', apiKey: '', enabled: false, models: { audioModels: [], videoModels: [], customModel: '', selectedAudioModel: '', selectedVideoModel: '' } },
        deepseek: { provider: 'deepseek', apiKey: '', enabled: false, models: { audioModels: [], videoModels: [], customModel: '', selectedAudioModel: '', selectedVideoModel: '' } },
        gemini: { provider: 'gemini', apiKey: '', enabled: false, models: { audioModels: [], videoModels: [], customModel: '', selectedAudioModel: '', selectedVideoModel: '' } },
        [provider]: {
          provider,
          apiKey,
          enabled: true,
          models: { audioModels: [model], videoModels: [model], customModel: model, selectedAudioModel: model, selectedVideoModel: model },
        },
      },
    };
    const result = await callAI(testSettings, 'Reply with "OK" only.', 'audio');
    return result.toLowerCase().includes('ok');
  } catch {
    return false;
  }
}

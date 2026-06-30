import { create } from 'zustand';
import {
  AISettings,
  AIProvider,
  AIProviderConfig,
  EqualizerState,
  EQPreset,
  DEFAULT_EQ_BANDS,
  EQ_PRESETS,
  DEFAULT_AI_MODELS,
} from '../types';

interface SettingsStore {
  ai: AISettings;
  equalizer: EqualizerState;

  // AI actions
  setAIEnabled: (enabled: boolean) => void;
  setActiveProvider: (provider: AIProvider) => void;
  updateProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => void;
  setProviderEnabled: (provider: AIProvider, enabled: boolean) => void;
  setApiKey: (provider: AIProvider, key: string) => void;
  setAudioModel: (provider: AIProvider, model: string) => void;
  setVideoModel: (provider: AIProvider, model: string) => void;
  setCustomModel: (provider: AIProvider, model: string) => void;

  // EQ actions
  setEQEnabled: (enabled: boolean) => void;
  setEQPreset: (preset: EQPreset) => void;
  setEQBandGain: (index: number, gain: number) => void;
}

const buildDefaultAI = (): AISettings => ({
  enabled: true,
  activeProvider: 'claude',
  providers: {
    claude: {
      provider: 'claude',
      apiKey: '',
      enabled: false,
      models: DEFAULT_AI_MODELS.claude,
    },
    openai: {
      provider: 'openai',
      apiKey: '',
      enabled: false,
      models: DEFAULT_AI_MODELS.openai,
    },
    deepseek: {
      provider: 'deepseek',
      apiKey: '',
      enabled: false,
      models: DEFAULT_AI_MODELS.deepseek,
    },
    gemini: {
      provider: 'gemini',
      apiKey: '',
      enabled: false,
      models: DEFAULT_AI_MODELS.gemini,
    },
  },
});

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ai: buildDefaultAI(),
  equalizer: {
    preset: 'flat',
    bands: DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
    enabled: false,
  },

  // ── AI ──────────────────────────────────────────────────────────────────────
  setAIEnabled: (enabled) =>
    set((s) => ({ ai: { ...s.ai, enabled } })),

  setActiveProvider: (provider) =>
    set((s) => ({ ai: { ...s.ai, activeProvider: provider } })),

  updateProviderConfig: (provider, config) =>
    set((s) => ({
      ai: {
        ...s.ai,
        providers: {
          ...s.ai.providers,
          [provider]: { ...s.ai.providers[provider], ...config },
        },
      },
    })),

  setProviderEnabled: (provider, enabled) => {
    get().updateProviderConfig(provider, { enabled });
  },

  setApiKey: (provider, key) => {
    get().updateProviderConfig(provider, { apiKey: key });
  },

  setAudioModel: (provider, model) => {
    const current = get().ai.providers[provider].models;
    get().updateProviderConfig(provider, {
      models: { ...current, selectedAudioModel: model },
    });
  },

  setVideoModel: (provider, model) => {
    const current = get().ai.providers[provider].models;
    get().updateProviderConfig(provider, {
      models: { ...current, selectedVideoModel: model },
    });
  },

  setCustomModel: (provider, model) => {
    const current = get().ai.providers[provider].models;
    get().updateProviderConfig(provider, {
      models: { ...current, customModel: model },
    });
  },

  // ── EQ ──────────────────────────────────────────────────────────────────────
  setEQEnabled: (enabled) =>
    set((s) => ({ equalizer: { ...s.equalizer, enabled } })),

  setEQPreset: (preset) => {
    const gains = EQ_PRESETS[preset];
    set((s) => ({
      equalizer: {
        ...s.equalizer,
        preset,
        bands: s.equalizer.bands.map((b, i) => ({ ...b, gain: gains[i] ?? 0 })),
      },
    }));
  },

  setEQBandGain: (index, gain) => {
    set((s) => {
      const bands = [...s.equalizer.bands];
      bands[index] = { ...bands[index], gain };
      return { equalizer: { ...s.equalizer, preset: 'custom', bands } };
    });
  },
}));

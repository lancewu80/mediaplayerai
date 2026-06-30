export interface AppTheme {
  bg: string;         // main background
  surface: string;    // card / panel background
  border: string;
  accent: string;     // red/pink highlight
  active: string;     // cyan highlight
  text: string;
  sub: string;        // secondary text
  icon: string;
  sliderTrack: string;
  sliderFill: string;
}

export const DARK: AppTheme = {
  bg:          '#16213e',
  surface:     '#1a1a2e',
  border:      '#2a2a4a',
  accent:      '#e94560',
  active:      '#00d4ff',
  text:        '#ffffff',
  sub:         '#a0a0b0',
  icon:        '#ffffff',
  sliderTrack: '#2a2a4a',
  sliderFill:  '#e94560',
};

export const LIGHT: AppTheme = {
  bg:          '#f0f2f5',
  surface:     '#ffffff',
  border:      '#dde1ea',
  accent:      '#d7263d',
  active:      '#0099bb',
  text:        '#111827',
  sub:         '#6b7280',
  icon:        '#374151',
  sliderTrack: '#d1d5db',
  sliderFill:  '#d7263d',
};

/** Returns the correct theme object based on isDark flag */
export function getTheme(isDark: boolean): AppTheme {
  return isDark ? DARK : LIGHT;
}

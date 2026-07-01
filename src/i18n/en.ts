const en = {
  // App
  appName: 'MediaPlayer AI',

  // Control panel top bar
  ai: 'AI',
  aiSettings: 'AI Settings',
  light: 'Light',
  dark: 'Dark',
  switchLang: '中文',          // label shown when current lang is English

  // Player controls
  noTrack: 'No track selected',

  // Play modes
  sequential: 'Sequential',
  shuffle: 'Shuffle',
  repeatOne: 'Repeat One',
  repeatAll: 'Repeat All',

  // Playlist toolbar
  playlist: 'Playlist',
  addFiles: 'Files',
  addDir: 'Dir',
  importPlaylist: 'Import',
  exportPlaylist: 'Export',

  // Playlist empty state
  emptyPlaylist: 'Playlist is empty',
  emptyPlaylistSub: 'Add files or a directory to get started',

  // Permissions
  permissionTitle: 'File Access Permission',
  permissionMessage: 'This app needs access to your files',
  permissionDenied: 'Permission Denied',
  permissionRequired: 'File access is required to add media',
  ask_later: 'Ask Later',
  directoryNotSupported: 'Directory scanning is not fully supported on mobile. Please use "Add Files" instead.',
  info: 'Info',

  // Video player
  videoPlayer: 'Video Player',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  subtitles: 'Subtitles',
  audioTrack: 'Audio Track',
  aspectRatio: 'Aspect Ratio',
  playbackSpeed: 'Speed',
  close: 'Close',

  // Subtitle panel
  subtitleSearch: 'Search Subtitles',
  subtitleOffset: 'Offset (ms)',
  subtitleStyle: 'Style',
  subtitleLang: 'Language',
  subtitleSearchBtn: 'Search',
  subtitleLoad: 'Load File',
  noSubtitles: 'No subtitles',

  // AI panel
  aiInfo: 'AI Info',
  aiLyrics: 'Lyrics',
  aiRecognize: 'Identify Song',
  aiHum: 'Hum to Search',
  aiEnabled: 'AI Enabled',
  aiDisabled: 'AI Disabled',

  // Subscription
  goPremium: 'Go Premium',
  premium: 'Premium',
  monthly: 'Monthly',
  yearly: 'Yearly',
  free7Day: '7-day free trial',
  subscribe: 'Subscribe',
  restore: 'Restore',
  cancel: 'Cancel',

  // Ads
  adSkip: 'Skip',

  // Common
  ok: 'OK',
  save: 'Save',
  test: 'Test',
  loading: 'Loading…',
  error: 'Error',
  success: 'Success',
  confirm: 'Confirm',
  deleteConfirm: 'Long press to remove',

  // Network / Cloud
  networkStream: 'Network Stream',
  cloudStorage: 'Cloud Storage',
  googleDrive: 'Google Drive',
  dropbox: 'Dropbox',
  smb: 'SMB Share',
  ftp: 'FTP',
  webdav: 'WebDAV',
  connect: 'Connect',
  disconnect: 'Disconnect',
} as const;

export type TranslationKeys = keyof typeof en;
export default en;

import { TranslationKeys } from './en';

const zh: Record<TranslationKeys, string> = {
  // App
  appName: 'MediaPlayer AI',

  // Control panel top bar
  ai: 'AI',
  aiSettings: 'AI 設定',
  light: '亮色',
  dark: '暗色',
  switchLang: 'English',      // label shown when current lang is Chinese

  // Player controls
  noTrack: '未選擇曲目',

  // Play modes
  sequential: '循序播放',
  shuffle: '隨機播放',
  repeatOne: '單曲循環',
  repeatAll: '全部循環',

  // Playlist toolbar
  playlist: '播放清單',
  addFiles: '加入檔案',
  addDir: '加入目錄',
  importPlaylist: '匯入',
  exportPlaylist: '匯出',

  // Playlist empty state
  emptyPlaylist: '播放清單是空的',
  emptyPlaylistSub: '新增檔案或目錄以開始播放',

  // Permissions
  permissionTitle: '檔案存取權限',
  permissionMessage: '此應用程式需要存取您的檔案',
  permissionDenied: '權限被拒絕',
  permissionRequired: '需要檔案存取權限才能新增媒體',
  ask_later: '稍後再問',
  directoryNotSupported: '行動裝置不完全支援目錄掃描。請改用「加入檔案」。',
  info: '資訊',

  // Video player
  videoPlayer: '影片播放器',
  fullscreen: '全螢幕',
  exitFullscreen: '離開全螢幕',
  subtitles: '字幕',
  audioTrack: '音軌',
  aspectRatio: '畫面比例',
  playbackSpeed: '播放速度',
  close: '關閉',

  // Subtitle panel
  subtitleSearch: '搜尋字幕',
  subtitleOffset: '偏移 (毫秒)',
  subtitleStyle: '字幕樣式',
  subtitleLang: '語言',
  subtitleSearchBtn: '搜尋',
  subtitleLoad: '載入字幕檔',
  noSubtitles: '無字幕',

  // AI panel
  aiInfo: 'AI 資訊',
  aiLyrics: '歌詞',
  aiRecognize: '聽音辨曲',
  aiHum: '哼唱搜尋',
  aiEnabled: 'AI 已啟用',
  aiDisabled: 'AI 已停用',

  // Subscription
  goPremium: '升級Premium',
  premium: 'Premium',
  monthly: '每月訂閱',
  yearly: '每年訂閱',
  free7Day: '7 天免費試用',
  subscribe: '訂閱',
  restore: '還原購買',
  cancel: '取消',

  // Ads
  adSkip: '跳過',

  // Common
  ok: '確定',
  save: '儲存',
  test: '測試',
  loading: '載入中…',
  error: '錯誤',
  success: '成功',
  confirm: '確認',
  deleteConfirm: '長按以移除',

  // Network / Cloud
  networkStream: '網路串流',
  cloudStorage: '雲端儲存',
  googleDrive: 'Google 雲端',
  dropbox: 'Dropbox',
  smb: 'SMB 共享',
  ftp: 'FTP',
  webdav: 'WebDAV',
  connect: '連線',
  disconnect: '中斷連線',
};

export default zh;

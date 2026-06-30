import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFileDialog: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFileDialog: (options: any) => ipcRenderer.invoke('dialog:saveFile', options),

  // File system
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  scanDirectory: (dirPath: string) => ipcRenderer.invoke('fs:scanDirectory', dirPath),

  // MPV player
  mpvCommand: (cmd: string, args: any[]) => ipcRenderer.invoke('mpv:command', cmd, args),
  mpvLoadFile: (uri: string) => ipcRenderer.invoke('mpv:loadfile', uri),
  mpvGetStatus: () => ipcRenderer.invoke('mpv:status'),
  mpvOnStatus: (cb: (s: any) => void) => {
    ipcRenderer.on('mpv:status-update', (_e, s) => cb(s));
    return () => ipcRenderer.removeAllListeners('mpv:status-update');
  },

  // Chromecast
  castDiscover: () => ipcRenderer.invoke('cast:discover'),
  castStart: (deviceId: string, uri: string, title: string, contentType: string) =>
    ipcRenderer.invoke('cast:start', deviceId, uri, title, contentType),
  castStop: () => ipcRenderer.invoke('cast:stop'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Platform
  platform: process.platform,
});

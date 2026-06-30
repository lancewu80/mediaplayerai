"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // File dialogs
    openFileDialog: (options) => electron_1.ipcRenderer.invoke('dialog:openFile', options),
    openDirectoryDialog: () => electron_1.ipcRenderer.invoke('dialog:openDirectory'),
    saveFileDialog: (options) => electron_1.ipcRenderer.invoke('dialog:saveFile', options),
    // File system
    readFile: (filePath) => electron_1.ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('fs:writeFile', filePath, content),
    scanDirectory: (dirPath) => electron_1.ipcRenderer.invoke('fs:scanDirectory', dirPath),
    // MPV player
    mpvCommand: (cmd, args) => electron_1.ipcRenderer.invoke('mpv:command', cmd, args),
    mpvLoadFile: (uri) => electron_1.ipcRenderer.invoke('mpv:loadfile', uri),
    mpvGetStatus: () => electron_1.ipcRenderer.invoke('mpv:status'),
    mpvOnStatus: (cb) => {
        electron_1.ipcRenderer.on('mpv:status-update', (_e, s) => cb(s));
        return () => electron_1.ipcRenderer.removeAllListeners('mpv:status-update');
    },
    // Chromecast
    castDiscover: () => electron_1.ipcRenderer.invoke('cast:discover'),
    castStart: (deviceId, uri, title, contentType) => electron_1.ipcRenderer.invoke('cast:start', deviceId, uri, title, contentType),
    castStop: () => electron_1.ipcRenderer.invoke('cast:stop'),
    // App info
    getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    // Platform
    platform: process.platform,
});

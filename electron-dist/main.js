"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#1a1a2e',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        fullscreenable: true, // allow renderer requestFullscreen() to work
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // allow loading local file:// URIs for media
        },
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        title: 'MediaPlayer AI',
        show: false,
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:8081');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '..', 'web-build', 'index.html'));
    }
    mainWindow.once('ready-to-show', () => mainWindow?.show());
    mainWindow.on('closed', () => { mainWindow = null; });
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
// ─── IPC: Dialogs ─────────────────────────────────────────────────────────────
electron_1.ipcMain.handle('dialog:openFile', async (_event, options) => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: [
            'openFile',
            ...(options.multiSelections ? ['multiSelections'] : []),
        ],
        filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? [] : result.filePaths;
});
electron_1.ipcMain.handle('dialog:openDirectory', async () => {
    const result = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
});
electron_1.ipcMain.handle('dialog:saveFile', async (_event, options) => {
    const result = await electron_1.dialog.showSaveDialog(mainWindow, {
        defaultPath: options.defaultPath,
        filters: options.filters ?? [{ name: 'JSON', extensions: ['json'] }],
    });
    return result.canceled ? null : result.filePath;
});
// ─── IPC: File System ─────────────────────────────────────────────────────────
electron_1.ipcMain.handle('fs:readFile', async (_event, filePath) => {
    return fs.readFileSync(filePath, 'utf8');
});
electron_1.ipcMain.handle('fs:writeFile', async (_event, filePath, content) => {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
});
electron_1.ipcMain.handle('fs:scanDirectory', async (_event, dirPath) => {
    const SUPPORTED = new Set([
        'mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'opus', 'aiff', 'ape', 'mid', 'midi', 'amr',
        'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mpg', 'mpeg', 'm4v', '3gp', 'ts', 'mts', 'vob', 'rmvb',
    ]);
    const results = [];
    function walk(dir) {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else {
                const ext = path.extname(entry.name).slice(1).toLowerCase();
                if (SUPPORTED.has(ext))
                    results.push(fullPath);
            }
        }
    }
    walk(dirPath);
    return results;
});
electron_1.ipcMain.handle('app:getVersion', () => electron_1.app.getVersion());
// ─── MPV player IPC ───────────────────────────────────────────────────────────
let mpvProcess = null;
let mpvSocketPath = '';
let mpvStatusCallback = null;
function getMpvPath() {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const binName = isWin ? 'mpv.exe' : 'mpv';
    const folder = isWin ? 'win32' : isMac ? 'darwin' : 'linux';
    if (electron_1.app.isPackaged) {
        // Installed app: binary lives in the extraResources/mpv/<platform>/ folder
        // which electron-builder copies next to the app's resources.
        return path.join(process.resourcesPath, 'mpv', folder, binName);
    }
    // Development: binary downloaded by scripts/download-mpv.js into resources/bin/<platform>/
    const devPath = path.join(__dirname, '..', 'resources', 'bin', folder, binName);
    if (fs.existsSync(devPath))
        return devPath;
    // Last-resort fallback: hope it's on PATH (useful in Docker / CI)
    return binName;
}
function startMpv(uri) {
    if (mpvProcess) {
        mpvProcess.kill();
        mpvProcess = null;
    }
    const ipcPath = process.platform === 'win32'
        ? '\\\\.\\pipe\\mpv-ipc'
        : '/tmp/mpv-ipc.sock';
    mpvSocketPath = ipcPath;
    const args = [
        uri,
        '--input-ipc-server=' + ipcPath,
        '--no-terminal',
        '--idle',
        '--keep-open=yes',
        `--wid=${mainWindow?.getNativeWindowHandle().readBigUInt64LE(0).toString() ?? ''}`,
    ];
    mpvProcess = (0, child_process_1.spawn)(getMpvPath(), args, { stdio: 'ignore' });
    mpvProcess.on('error', (e) => console.error('mpv error', e));
}
electron_1.ipcMain.handle('mpv:command', async (_event, cmd, args) => {
    if (!mpvProcess)
        return;
    // Send JSON IPC command via named pipe / unix socket
    const net = await Promise.resolve().then(() => __importStar(require('net')));
    const client = net.createConnection(mpvSocketPath);
    client.write(JSON.stringify({ command: [cmd, ...args] }) + '\n');
    client.end();
});
electron_1.ipcMain.handle('mpv:loadfile', async (_event, uri) => {
    startMpv(uri);
});
electron_1.ipcMain.handle('mpv:status', async () => {
    // Return last known status (simplified — real impl polls via IPC socket)
    return {};
});
// ─── Chromecast IPC (basic mdns discovery placeholder) ────────────────────────
electron_1.ipcMain.handle('cast:discover', async () => {
    // Real implementation would use node-mdns or castv2-client to discover devices
    // Placeholder returns empty until the user installs cast dependencies
    return [];
});
electron_1.ipcMain.handle('cast:start', async (_event, deviceId, uri, title) => {
    console.log(`Cast start: ${title} → device ${deviceId} (${uri})`);
});
electron_1.ipcMain.handle('cast:stop', async () => {
    console.log('Cast stop');
});

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    fullscreenable: true,       // allow renderer requestFullscreen() to work
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,       // allow loading local file:// URIs for media
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    title: 'MediaPlayer AI',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'web-build', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC: Dialogs ─────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async (_event, options: any) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: [
      'openFile',
      ...(options.multiSelections ? ['multiSelections' as const] : []),
    ],
    filters: options.filters ?? [{ name: 'All Files', extensions: ['*'] }],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_event, options: any) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: options.defaultPath,
    filters: options.filters ?? [{ name: 'JSON', extensions: ['json'] }],
  });
  return result.canceled ? null : result.filePath;
});

// ─── IPC: File System ─────────────────────────────────────────────────────────

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return fs.readFileSync(filePath, 'utf8');
});

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
});

ipcMain.handle('fs:scanDirectory', async (_event, dirPath: string) => {
  const SUPPORTED = new Set([
    'mp3','wav','flac','aac','m4a','ogg','wma','opus','aiff','ape','mid','midi','amr',
    'mp4','mkv','avi','mov','wmv','flv','webm','mpg','mpeg','m4v','3gp','ts','mts','vob','rmvb',
  ]);

  const results: string[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (SUPPORTED.has(ext)) results.push(fullPath);
      }
    }
  }

  walk(dirPath);
  return results;
});

ipcMain.handle('app:getVersion', () => app.getVersion());

// ─── MPV player IPC ───────────────────────────────────────────────────────────

let mpvProcess: ChildProcess | null = null;
let mpvSocketPath = '';
let mpvStatusCallback: ((s: any) => void) | null = null;

function getMpvPath(): string {
  const isWin   = process.platform === 'win32';
  const isMac   = process.platform === 'darwin';
  const binName = isWin ? 'mpv.exe' : 'mpv';
  const folder  = isWin ? 'win32' : isMac ? 'darwin' : 'linux';

  if (app.isPackaged) {
    // Installed app: binary lives in the extraResources/mpv/<platform>/ folder
    // which electron-builder copies next to the app's resources.
    return path.join(process.resourcesPath, 'mpv', folder, binName);
  }

  // Development: binary downloaded by scripts/download-mpv.js into resources/bin/<platform>/
  const devPath = path.join(__dirname, '..', 'resources', 'bin', folder, binName);
  if (fs.existsSync(devPath)) return devPath;

  // Last-resort fallback: hope it's on PATH (useful in Docker / CI)
  return binName;
}

function startMpv(uri: string) {
  if (mpvProcess) { mpvProcess.kill(); mpvProcess = null; }

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

  mpvProcess = spawn(getMpvPath(), args, { stdio: 'ignore' });
  mpvProcess.on('error', (e) => console.error('mpv error', e));
}

ipcMain.handle('mpv:command', async (_event, cmd: string, args: any[]) => {
  if (!mpvProcess) return;
  // Send JSON IPC command via named pipe / unix socket
  const net = await import('net');
  const client = net.createConnection(mpvSocketPath);
  client.write(JSON.stringify({ command: [cmd, ...args] }) + '\n');
  client.end();
});

ipcMain.handle('mpv:loadfile', async (_event, uri: string) => {
  startMpv(uri);
});

ipcMain.handle('mpv:status', async () => {
  // Return last known status (simplified — real impl polls via IPC socket)
  return {};
});

// ─── Chromecast IPC (basic mdns discovery placeholder) ────────────────────────

ipcMain.handle('cast:discover', async () => {
  // Real implementation would use node-mdns or castv2-client to discover devices
  // Placeholder returns empty until the user installs cast dependencies
  return [];
});

ipcMain.handle('cast:start', async (_event, deviceId: string, uri: string, title: string) => {
  console.log(`Cast start: ${title} → device ${deviceId} (${uri})`);
});

ipcMain.handle('cast:stop', async () => {
  console.log('Cast stop');
});

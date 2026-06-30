#!/usr/bin/env node
/**
 * scripts/download-mpv.js
 *
 * Downloads pre-built mpv binaries into resources/bin/<platform>/
 * so electron-builder can bundle them inside the installer.
 *
 * Run automatically via:  npm run postinstall
 * Or manually:            node scripts/download-mpv.js
 *
 * Sources (all open-source, LGPL):
 *   Windows : https://github.com/shinchiro/mpv-winbuild-cmake/releases  (mpv-x86_64)
 *   macOS   : https://laboratory.stolendata.net/~djinn/mpv_osx/          (mpv.tar.gz)
 *   Linux   : bundled via AppImage / apt — not downloaded here
 */

const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const { execSync } = require('child_process');
const os       = require('os');

// ─── Config ───────────────────────────────────────────────────────────────────

const MPV_VERSION = '0.38.0';

const DOWNLOADS = {
  win32: {
    url: `https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/${MPV_VERSION}/mpv-x86_64-${MPV_VERSION}-git.7z`,
    // We only extract mpv.exe from the archive
    binary: 'mpv.exe',
    archiveName: 'mpv-win.7z',
    extractCmd: (archivePath, destDir) =>
      `7z e "${archivePath}" mpv.exe -o"${destDir}" -y`,
  },
  darwin: {
    url: `https://laboratory.stolendata.net/~djinn/mpv_osx/mpv-${MPV_VERSION}.tar.gz`,
    binary: 'mpv',
    archiveName: 'mpv-mac.tar.gz',
    extractCmd: (archivePath, destDir) =>
      `tar -xzf "${archivePath}" --strip-components=2 -C "${destDir}" mpv.app/Contents/MacOS/mpv`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    function get(u) {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const total = Number(res.headers['content-length'] || 0);
        let received = 0;
        res.on('data', (chunk) => {
          received += chunk.length;
          if (total) {
            process.stdout.write(`\r  ${Math.round((received / total) * 100)}%`);
          }
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); process.stdout.write('\n'); resolve(); });
      }).on('error', reject);
    }
    get(url);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const platform = process.platform;

  if (platform === 'linux') {
    // On Linux we rely on the system mpv (installed via apt/dnf in CI,
    // or bundled in AppImage via electron-builder's afterPack hook).
    console.log('[mpv] Linux: system mpv will be used. Skipping download.');
    return;
  }

  const cfg = DOWNLOADS[platform];
  if (!cfg) {
    console.log(`[mpv] Unsupported platform: ${platform}. Skipping.`);
    return;
  }

  const destDir  = path.resolve(__dirname, '..', 'resources', 'bin', platform);
  const binaryPath = path.join(destDir, cfg.binary);

  // Already downloaded?
  if (fs.existsSync(binaryPath)) {
    console.log(`[mpv] Already present: ${binaryPath}`);
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });

  const tmpDir     = fs.mkdtempSync(path.join(os.tmpdir(), 'mpv-'));
  const archivePath = path.join(tmpDir, cfg.archiveName);

  console.log(`[mpv] Downloading mpv ${MPV_VERSION} for ${platform}…`);
  console.log(`      from: ${cfg.url}`);
  await download(cfg.url, archivePath);

  console.log(`[mpv] Extracting ${cfg.binary}…`);
  const cmd = cfg.extractCmd(archivePath, destDir);
  execSync(cmd, { stdio: 'inherit' });

  // Make executable on macOS/Linux
  if (platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  // Clean up archive
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`[mpv] ✓ Bundled: ${binaryPath}`);
}

main().catch((err) => {
  console.error('[mpv] Download failed:', err.message);
  console.error('      The player will fall back to HTML5 video on Electron.');
  // Non-fatal: don't exit(1) — rest of npm install should still succeed
});

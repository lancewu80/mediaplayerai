/**
 * Jest Global Setup
 *
 * Loads .env.test before any test suite runs.
 * This ensures EXPO_PUBLIC_ADS_ENABLED=false etc. are set.
 */
const path = require('path');
const fs   = require('fs');

module.exports = async function () {
  const envPath = path.resolve(__dirname, '.env.test');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key) process.env[key.trim()] = rest.join('=').trim();
  }

  console.log('[jest.globalSetup] Loaded .env.test — ads disabled for testing');
};

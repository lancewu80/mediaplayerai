const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Force Metro to use CommonJS (main field) instead of ESM (exports field).
 * Some packages like zustand ship both CJS and ESM — Metro picks up the
 * .mjs files via package exports and chokes on `import.meta` syntax.
 * Disabling unstable_enablePackageExports makes Metro fall back to the
 * traditional `main` field which always points to the CJS bundle.
 */
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

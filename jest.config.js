/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',

  // Load .env.test automatically for all tests
  globalSetup: '<rootDir>/jest.globalSetup.js',

  // Module name mapper for @/ alias
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform patterns
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native|' +
      '@react-native|' +
      'expo|' +
      '@expo|' +
      'react-native-google-mobile-ads|' +
      'react-native-purchases|' +
      'react-native-vlc-media-player|' +
      'react-native-google-cast' +
    ')/)',
  ],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/types/**',
  ],

  // Setup files
  setupFiles: ['<rootDir>/jest.setup.js'],
};

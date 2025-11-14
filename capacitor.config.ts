import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.dumbmsg.android',
  appName: 'dumb-android',
  webDir: 'dist/dumb-android/browser',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      "*"
    ]
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;

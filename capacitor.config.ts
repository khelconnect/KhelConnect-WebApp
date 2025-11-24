import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.khelconnect.app',
  appName: 'Khelconnect',
  webDir: 'out',
  // Add this for live development ONLY (Remove before publishing!)
  server: {
    url: 'http://192.168.0.139:3000', // Replace with your computer's IP
    cleartext: true
  }
};

export default config;

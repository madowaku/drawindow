import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0', allowedHosts: ['terminal.local'], proxy: { '/api': 'http://127.0.0.1:8787' },
    // The Android LAN preview must not serve Worker credentials or local backups.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.dev.vars*', '**/artifacts/local/**'] },
  },
  build: { target: 'es2022' },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    // Pre-bundle the CommonJS dependency that caused the
    // "retry does not provide an export named default" error.
    include: ['retry'],

    // Keep Decart + LiveKit source unoptimized so their
    // frame-metadata worker resolves correctly.
    exclude: ['@decartai/sdk', 'livekit-client'],
  },

  worker: {
    format: 'es',
  },

  server: {
    host: 'localhost',
    port: 5173,
  },
});
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const root = path.resolve('.');
  const env = loadEnv(mode, root, '');

  // Robust Tauri 2 & Capacitor Detection
  const isTauri = process.env.TAURI_ENV_PLATFORM ||
                  process.env.TAURI_PLATFORM ||
                  process.env.TAURI_ARCH ||
                  process.env.TAURI_FAMILY ||
                  mode === 'tauri' ||
                  process.env.npm_lifecycle_event?.includes('tauri');

  const isCapacitor = process.env.CAPACITOR ||
                      process.env.npm_lifecycle_event?.includes('cap');

  return {
    base: (isTauri || isCapacitor) ? './' : '/FamilyHub/',
    server: {
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': root,
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  };
});

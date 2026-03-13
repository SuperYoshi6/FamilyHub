import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const root = path.resolve('.');
    const env = loadEnv(mode, root, '');
    return {
      base: '/FamilyHub/', 
      server: {
        port: 3000,
        host: '0.0.0.0',
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
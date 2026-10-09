import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // The SPA imports src/shared/ through `@shared` (§3.5.2, §6.0.3).
    alias: { '@shared': path.resolve(repoRoot, 'src/shared') },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 8081,
    },
    fs: {
      allow: [repoRoot],
    },
  },
});

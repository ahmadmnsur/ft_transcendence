import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from './src/legal/parse.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// An unsupported Markdown construct in the legal pages fails the build
// (§3.5.4). The check runs over exactly the files the pages import: any
// `.md` under docs/legal/ loaded with `?raw`, in dev and in build.
function legalCheck(): Plugin {
  const legalDir = path.resolve(repoRoot, 'docs/legal');
  return {
    name: 'peerconnect-legal-check',
    enforce: 'pre',
    load(id) {
      const queryIndex = id.indexOf('?');
      const file = queryIndex < 0 ? id : id.slice(0, queryIndex);
      const query = queryIndex < 0 ? '' : id.slice(queryIndex);
      if (!query.includes('raw') || path.extname(file) !== '.md') return null;
      if (!path.resolve(file).startsWith(legalDir + path.sep)) return null;
      // Watched before parsing so `vite dev` reloads once a file that
      // throws on load is fixed.
      this.addWatchFile(file);
      const text = fs.readFileSync(file, 'utf8');
      // Throws with `<path>:<line>: <reason>`; the error propagates and
      // the build fails.
      parseMarkdown(text, path.relative(repoRoot, path.resolve(file)));
      // Null lets Vite's own `?raw` handling load the file.
      return null;
    },
  };
}

export default defineConfig({
  plugins: [legalCheck(), react(), tailwindcss()],
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

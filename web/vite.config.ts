import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from './src/legal/parse.ts';
import { checkLegalText, readLegalDate, checkSameDate } from './src/legal/check.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
      const base = file.replace(/(?:\.fr|\.ar)?\.md$/, '');
      const siblings = [`${base}.md`, `${base}.fr.md`, `${base}.ar.md`];
      for (const sibling of siblings) this.addWatchFile(sibling);
      const [english, ...translations] = siblings.map((sibling) => {
        const fileName = path.relative(repoRoot, sibling);
        if (!fs.existsSync(sibling)) {
          const name = path.basename(base);
          throw new Error(`${fileName}: missing; each legal page is three files: ${name}.md, ${name}.fr.md and ${name}.ar.md (§3.5.4)`);
        }
        const parsed = parseMarkdown(fs.readFileSync(sibling, 'utf8'), fileName);
        checkLegalText(parsed, fileName);
        return { fileName, date: readLegalDate(parsed, fileName) };
      });
      checkSameDate(english, translations);
      return null;
    },
  };
}

export default defineConfig({
  plugins: [legalCheck(), react(), tailwindcss()],
  resolve: {
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

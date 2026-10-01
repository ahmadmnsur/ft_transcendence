import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ['test/[0-9][0-9]-*/*.test.ts'],
    fileParallelism: false,
  },
});

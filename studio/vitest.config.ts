import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// tsconfig の paths（@/* → src/*）を vitest にも効かせる。@niqostudio/* を誤マッチさせないため
// 完全プレフィックス（^@/）の regex で限定し、Windows のパス区切りは forward slash に正規化する。
const src = fileURLToPath(new URL('./src', import.meta.url)).replace(/\\/g, '/');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: [{ find: /^@\//, replacement: `${src}/` }],
  },
});

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite';

const entries = {
  index: resolve(import.meta.dirname, 'src/index.ts'),
  'builder/index': resolve(import.meta.dirname, 'src/builder/index.ts'),
  'builder/vite': resolve(import.meta.dirname, 'src/builder/vite.ts'),
  'builder/astro': resolve(import.meta.dirname, 'src/builder/astro.ts'),
  'builder/next': resolve(import.meta.dirname, 'src/builder/next.ts'),
  'builder/webpack': resolve(import.meta.dirname, 'src/builder/webpack.ts'),
  'purge/vite': resolve(import.meta.dirname, 'src/purge/vite.ts'),
  'purge/astro': resolve(import.meta.dirname, 'src/purge/astro.ts'),
};

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      outDir: 'dist',
      entryRoot: 'src',
    }),
  ],
  test: {
    environment: 'node',
    // 実ビルドを伴うテストが多く、CI（4 vCPU）では既定の5秒を超えることがある
    testTimeout: 15000,
    typecheck: {
      enabled: true,
      exclude: ['**/node_modules/**', '**/.git/**'],
    },
  },
  build: {
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^node:/, 'lism-css', /^lism-css\//, 'sass', 'postcss', 'autoprefixer', 'cssnano', 'glob', 'jiti', 'vite', 'astro'],
      output: {
        dir: 'dist',
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});

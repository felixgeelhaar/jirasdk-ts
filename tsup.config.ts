import { defineConfig } from 'tsup';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    SDK_VERSION_BUILD: JSON.stringify(pkg.version),
  },
  entry: {
    index: 'src/index.ts',
    'auth/index': 'src/auth/index.ts',
    'transport/index': 'src/transport/index.ts',
    'errors/index': 'src/errors/index.ts',
    'schemas/index': 'src/schemas/index.ts',
    'services/index': 'src/services/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
});

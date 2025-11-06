import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'config/index': 'src/config/index.ts',
    'types/index': 'src/types/index.ts',
    'dtos/index': 'src/dtos/index.ts',
    'schemas/index': 'src/schemas/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});


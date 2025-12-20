import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: './src/index.ts',
  plugins: [
    typescript({
      declaration: false,
      declarationMap: false,
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
      module: 'esnext',
      target: 'es2019'
    }), 
    terser()
  ],
  external: [], // Bundle everything
  output: [
    {
      file: './dist/odata-builder.esm.js',
      format: 'esm',
      exports: 'auto'
    },
    {
      file: './dist/odata-builder.js',
      format: 'cjs',
      exports: 'auto'
    },
  ],
};
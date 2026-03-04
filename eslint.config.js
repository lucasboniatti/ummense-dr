const tsParser = require('@typescript-eslint/parser');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['packages/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: [
      'packages/**/__tests__/**/*.{ts,tsx,js,jsx,mjs,cjs}',
      'packages/**/*.test.{ts,tsx,js,jsx,mjs,cjs}',
      'packages/**/*.spec.{ts,tsx,js,jsx,mjs,cjs}',
    ],
    rules: {
      'no-eval': 'off',
      'no-implied-eval': 'off',
    },
  },
];

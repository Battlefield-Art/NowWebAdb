import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'max-lines': ['warn', { max: 260, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 160, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 5],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['src/lib/i18n/messages/**/*.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
  {
    // TanStack Virtual's `useVirtualizer()` returns functions the React Compiler cannot
    // memoize, so it skips this component only. Virtualized rows are rendered inline, so
    // no memoized child receives those values and the advisory does not apply here.
    files: ['src/features/logcat/LogcatConsole.tsx'],
    rules: {
      'react-hooks/incompatible-library': 'off',
    },
  },
);

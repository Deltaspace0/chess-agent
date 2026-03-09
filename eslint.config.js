import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', '**/stockfish.js']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{cjs,js,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@stylistic': stylistic
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'curly': ['error'],
      'arrow-body-style': ['error', 'as-needed'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/no-trailing-spaces': ['error'],
      "@typescript-eslint/no-require-imports": "off"
    },
  },
);

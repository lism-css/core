// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import { defineConfig } from 'eslint/config';
import react from 'eslint-plugin-react';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import astroParser from 'astro-eslint-parser';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.astro/**',
      '**/.turbo/**',
      // 言語別テンプレ overlay（配布用の差分ファイル。tsconfig の project service 対象外）
      '**/.lang/**',
      // skill 同梱の補助スクリプト（配布用の独立 Node スクリプト。tsconfig の project service 対象外）
      'skills/*/scripts/**',
      'apps/catalog/.storybook/**',
      'apps/catalog/storybook-static/**',
      'eslint.config.mjs',
      'lint-staged.config.mjs',
      '**/bin/**/*.mjs',
      'packages/lism-css/config.d.ts',
      '**/.prettierrc.cjs',
      '**/.stylelintrc.mjs',
      '**/vite.config.*',
      // プロジェクト/テンプレの設定ファイル（型 lint 対象外。tsconfig の project service に含めない）
      '**/next.config.*',
      '**/lism.config.*',
      '**/__*',
      // mockup パッケージのテスト用 fixture ビューア（tsconfig の project service 対象外）
      'packages/mockup/src/test-helpers/viewer/**',
    ],
  },
  eslintConfigPrettier,
  eslint.configs.recommended,
  // JavaScriptファイルには通常のrecommendedを適用
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        projectService: {
          allowDefaultProject: ['scripts/*.mjs', 'packages/*/scripts/*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // TypeScriptファイルには型チェック付きのrecommendedを適用
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // extends: compat.extends('plugin:react/recommended'),
    settings: {
      react: {
        version: '18',
      },
    },
    plugins: {
      react,
    },
    rules: {
      'react/react-in-jsx-scope': 0,
      'react/prop-types': 0,

      'react/no-unknown-property': [
        2,
        {
          ignore: ['jsx', 'global'],
        },
      ],

      // TypeScript ESLint rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
  {
    // lism-ui の React コンポーネントには `{...(props as object)}` 等の意図的なアサーションがある。
    // これは tsc の TS2590（union 型が複雑すぎる）回避のためのもので、
    // typescript-eslint >=8.62 の no-unnecessary-type-assertion は「不要」と誤検知するため無効化する。
    files: ['packages/lism-ui/src/components/**/react/*.tsx'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  {
    files: ['packages/lism-ui/src/**/astro/**/*.ts', 'packages/lism-ui/src/components/astro.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: { projectService: false },
    },
  },
  // scripts/*.mjs は型情報なしで lint する。
  // tseslint v8 + ESLint v9 の projectService は、複数ファイルを同時に投入したときに
  // 新規 .mjs を default project に登録し損なうことがあり、lint-staged 経由の pre-commit で
  // "not found by the project service" になるため、これらは projectService の対象外にする。
  {
    files: ['scripts/*.mjs', 'packages/*/scripts/*.mjs'],
    languageOptions: {
      parserOptions: { projectService: false },
    },
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: false,
        project: null,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { astroHTML: 'readonly' },
    },
    rules: {
      'react/no-unknown-property': 'off',
      'no-irregular-whitespace': 'off',
    },
  }
);

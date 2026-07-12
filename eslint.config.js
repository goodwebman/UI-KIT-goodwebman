import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import storybook from 'eslint-plugin-storybook';
import importX from 'eslint-plugin-import-x';
import tseslint from 'typescript-eslint';

const SRC_FILES = ['src/**/*.{ts,tsx}'];
const STORY_FILES = ['**/*.stories.{ts,tsx}'];
const TEST_FILES = ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'];
const INFRA_FILES = [
  '*.config.{js,ts,mts,cts}',
  'eslint.config.js',
  'vitest.setup.ts',
  '.storybook/**/*.ts',
  '.storybook/**/*.tsx',
];

const config = tseslint.config(
  // ── ignores ──────────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'storybook-static/**',
      'coverage/**',
      'node_modules/**',
      '**/*.d.ts',
      // автогенерация иконок — не линтится
      'src/icons/generated/**',
      'src/icons/registry.ts',
    ],
  },

  // ── a11y (все tsx/jsx) ────────────────────────────────────────────────────
  jsxA11y.flatConfigs.recommended,

  // ── исходники кита: type-aware strict ──────────────────────────────────────
  {
    files: SRC_FILES,
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
          alwaysTryTypes: true,
        },
      },
      'import-x/internal-regex': '^@/',
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import-x': importX,
    },
    rules: {
      // react / hooks
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // импорты: реальные баги (циклы, дубликаты), без капризной сортировки
      'import-x/no-cycle': ['error', { maxDepth: 10 }],
      'import-x/no-duplicates': ['error', { considerQueryString: true }],
      'import-x/no-self-import': 'error',
      'import-x/no-empty-named-blocks': 'error',

      // границы модулей — изоляция 
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message: 'Импортируй именованные хуки и типы из react, не дефолтный экспорт.',
            },
          ],
          patterns: [
            {
              group: ['**/components/index', '**/components/index.ts', '@/components'],
              message:
                'Не импортируй через barrel компонентов изнутри кита — ломает tree-shaking и плодит циклы. Берите конкретный модуль: @/components/UIButton.',
            },
            {
              group: ['../../..', '../../../**', '../../../**/*'],
              message: 'Слишком глубокий relative-импорт (выше src). Используй alias @/...',
            },
            {
              group: ['src/**', 'src'],
              message: 'Не импортируй по абсолютному пути от корня проекта — используй alias @/...',
            },
          ],
        },
      ],

      // TS-строгости
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      // boolean-fallback через `||` (disabled || loading и т.п.) корректен в UI-коде;
      // `??` здесь сломал бы логику. Правило слишком шумное для компонентов.
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },

  // ── инфра/конфиги/storybook-config: без type-aware, node-окружение ─────────
  {
    files: INFRA_FILES,
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // ── node-скрипты (кодогенерация и т.п.) ────────────────────────────────────
  {
    files: ['scripts/**/*.{js,mjs,cjs,ts}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // ── иконки: фабрика/реестр экспортируют не-компоненты; HMR-правило неактуально ──
  {
    files: ['src/icons/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // ── storybook-правила для stories ─────────────────────────────────────────
  ...storybook.configs['flat/recommended'],
  {
    files: STORY_FILES,
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
    },
  },

  // ── тесты: послабления для ассертов/моков ─────────────────────────────────
  {
    files: TEST_FILES,
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
);

export default config;

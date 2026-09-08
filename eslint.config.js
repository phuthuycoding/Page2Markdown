import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Đặt cuối cùng: tắt mọi quy tắc ESLint đụng vào định dạng, để Prettier là
  // nơi duy nhất quyết định hình thức code — hai công cụ cãi nhau thì hook sẽ
  // sửa qua sửa lại không dừng.
  prettier,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker, chrome: 'readonly' },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  }
);

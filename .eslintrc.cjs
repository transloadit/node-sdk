module.exports = {
  root: true,
  extends: ['transloadit', 'prettier'],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 11,
    requireConfigFile: false,
  },
  globals: {
    // https://github.com/Chatie/eslint-config/issues/45#issuecomment-885507652
    NodeJS: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.mjs', '.mts'],
      },
    },
  },
  rules: {
    'import/no-unresolved': 'off',
    'import/extensions': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
  },
  overrides: [
    {
      files: 'test/**',
      globals: {
        afterAll: true,
        afterEach: true,
        beforeAll: true,
        beforeEach: true,
        describe: true,
        it: true,
        vi: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: 'examples/**',
      rules: {
        'no-console': 0,
        'import/no-extraneous-dependencies': 0,
        'import/no-unresolved': 0,
      },
    },
  ],
}

module.exports = {
  root: true,
  extends: ['transloadit', 'prettier'],
  parserOptions: {
    ecmaVersion: 11,
    requireConfigFile: false,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  rules: {
    'import/extensions': 'off',
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
  ],
}

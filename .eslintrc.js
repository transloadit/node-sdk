module.exports = {
  root: true,
  extends: ['transloadit', 'prettier'],
  parserOptions: {
    ecmaVersion: 11,
    requireConfigFile: false,
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
        'import/extensions': 'off',
      },
    },
  ],
}

module.exports = {
  extends      : 'transloadit',
  parserOptions: {
    ecmaVersion      : 11,
    requireConfigFile: false,
  },
  rules: {
    // TODO remove when we support #private
    'no-underscore-dangle': ['error', {
      allow               : [],
      allowAfterThis      : true,
      allowAfterSuper     : true,
      enforceInMethodNames: false,
    }],
  },
}

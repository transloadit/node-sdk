module.exports = {
  // To support BigInt etc (1000000n)
  parserOptions: { ecmaVersion: 2020 },
  extends      : 'airbnb-base',
  env          : {
    node: true,
  },
  rules: {
    // From standard:
    semi                         : ['error', 'never'],
    'space-before-function-paren': ['error', 'always'],
    'object-curly-newline'       : ['error', { multiline: true, consistent: true }],

    // Override airbnb rules:
    'no-plusplus'         : 0,
    'max-classes-per-file': 0,
    'max-len'             : 0,
    'no-underscore-dangle': [
      'error', {
        allow               : [],
        allowAfterThis      : true,
        allowAfterSuper     : true,
        enforceInMethodNames: false,
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message : 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message : 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message : '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],

    // transloadit custom rules:
    'key-spacing': [
      'error',
      {
        multiLine: {
          beforeColon: false,
          afterColon : true,
        },
        align: {
          beforeColon: false,
          afterColon : true,
          on         : 'colon',
          mode       : 'strict',
        },
      },
    ],
    'no-multi-spaces': 0,
  },
}

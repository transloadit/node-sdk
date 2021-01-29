// Selectively include rules from airbnb https://github.com/transloadit/node-sdk/issues/90
// eslint-disable-next-line import/no-extraneous-dependencies
const airbnbRulesImports = require('eslint-config-airbnb-base/rules/imports').rules

module.exports = {
  extends: 'standard',
  env    : {
    es6 : true,
    jest: true,
    node: true,
  },
  rules: {
    // See https://github.com/transloadit/node-sdk/issues/93
    'import/no-extraneous-dependencies': airbnbRulesImports['import/no-extraneous-dependencies'],
    'no-multi-spaces'                  : 0,
    'comma-dangle'                     : [
      'error',
      'always-multiline',
    ],
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
  },
}

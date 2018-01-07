'use strict';

module.exports = {
  parser: 'babel-eslint',
  extends: 'idiomatic',
  rules: {
    "one-var": 'off',
    "arrow-parens": ["error", "as-needed"],
    "semi": ["error", "never"],
    "indent": ["error", 4],
    "max-len": [
      "error",
      { "code": 100,
        "ignoreTemplateLiterals": true,
        "ignoreStrings": true
      }
    ]
  }
}
// https://eslint.org/docs/user-guide/configuring

const defaultsDeep = require( 'lodash.defaultsdeep' );

module.exports = defaultsDeep( {
    parser: 'babel-eslint',
    env: { 
        "node": true,
        es6: true
    },

    // project-specific rules here
    rules: {
        'no-undef': ['error']
    }
}, require( 'jimhigson-my-eslint-rules' ) )

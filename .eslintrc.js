// https://eslint.org/docs/user-guide/configuring

const defaultsDeep = require( 'lodash.defaultsdeep' );

module.exports = defaultsDeep( {
    parser: 'babel-eslint',
    env: { 
        "node": true
    },
}, require( 'jimhigson-my-eslint-rules' ) )

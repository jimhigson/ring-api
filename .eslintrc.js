// https://eslint.org/docs/user-guide/configuring

const defaultsDeep = require( 'lodash.defaultsdeep' );

module.exports = defaultsDeep( {
    parser: 'babel-eslint'
    // project-specific rules here
}, require( 'jimhigson-my-eslint-rules' ) )

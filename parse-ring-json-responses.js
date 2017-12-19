'use strict';

const contentType = require( 'content-type' );

const jsonBigIntParse = require('json-bigint')({"storeAsString": true}).parse;

module.exports = (body, response, resolveWithFullResponse) => {

    const responseContentType = (contentType.parse( response )).type;

    if ( responseContentType === 'application/json')
        return jsonBigIntParse(body);
    else
        return body;
};
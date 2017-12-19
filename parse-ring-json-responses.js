'use strict';

const contentType = require( 'content-type' );

const jsonBigIntParse = require('json-bigint')({"storeAsString": true}).parse;

const isJson = response => {
    const contentTypeHeader = response.headers['content-type'];

    if( !contentTypeHeader )
        return false;

    const type = (contentType.parse( contentTypeHeader )).type;

    return (type === 'application/json');
};

module.exports = (body, response, resolveWithFullResponse) => {

    if ( isJson( response ) )
        return jsonBigIntParse(body);
    else
        return body;
};
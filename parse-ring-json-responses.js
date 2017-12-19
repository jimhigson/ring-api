'use strict';

const contentType = require( 'content-type' );
const jsonBigIntParse = require('json-bigint')({"storeAsString": true}).parse;

const propagatedError = require( './propagated-error' );

const isJson = response => {
    try {

        const contentTypeHeader = response.headers['content-type'];

        if( !contentTypeHeader )
            return false;

        const type = (contentType.parse( contentTypeHeader )).type;

        return (type === 'application/json');

    } catch( e ) {
        throw propagatedError( 'could not tell if response is json', e );
    }
};

module.exports = (body, response, resolveWithFullResponse) => {

    if ( isJson( response ) ) {

        try {
            // Some of the ring endpoints return an empty response (but not a 204 status code) while claiming
            // to be JSON. In this case, trying to parse the empty string as json will fail.
            // To avoid the failure, return an empty object
            if( !body.length ) {
                return {};
            }

            return jsonBigIntParse(body);
        } catch ( e ) {
            throw propagatedError( `invalid json in response: ${response}`, e );
        }
    }else
        return body;
};
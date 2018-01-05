'use strict';

const logger = require('debug')('ring-api');
const apiUrls = require('./api-urls');
const restClient = require( './rest-client' );
const getActiveDings = require( './get-active-dings' );

const first = require( 'lodash.first' );
const maxTries = 10;

const waitForDing = async () => {

    // poll until the livestream is ready up to a maximum number of times
    for( let tries = 0 ; tries < maxTries ; tries++ ) {

        logger( `waiting for ding, attempt ${tries}` );

        const dings = await getActiveDings( {burst: true} );

        const liveStreamDing = first( dings );

        if( liveStreamDing )
            return liveStreamDing;
    }

    throw new Error( `could not get a ding for this livestream after ${maxTries} attempts` );
};

module.exports = async (device) => {
    // create a new live stream:
    await restClient.authenticatedRequest( 'POST', apiUrls.doorbots().device( device ).liveStream() );

    return waitForDing();
};
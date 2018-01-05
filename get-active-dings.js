'use strict';

const apiUrls = require('./api-urls');
const restClient = require( './rest-client' );
const logger = require('debug')('ring-api');

module.exports = async ( {burst = false} = { burst: false } ) => {

    const dings = await restClient.authenticatedRequest( 'GET', apiUrls.dings().active( {burst} ) );

    const parseDing = ding => {
        ding.now = new Date( ding.now / 1000 );
    };

    dings.forEach( parseDing );

    return dings;
};
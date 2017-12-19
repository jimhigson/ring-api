'use strict';

const apiUrls = require('./api-urls');
const restClient = require( './rest-client' );

module.exports = async ( {burst = false} ) => {
    const dings = await restClient.makeRequest( 'GET', apiUrls.dings().active( {burst} ) );

    const parseDing = ding => {
        ding.now = new Date( ding.now / 1000 );
    };

    dings.forEach( parseDing );

    return dings;
};
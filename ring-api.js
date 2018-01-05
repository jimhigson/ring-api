'use strict';

const apiUrls = require('./api-urls');
const restClient = require( './rest-client' );

const logger = require('debug')('ring-api');
const EventEmitter = require('events');

module.exports = ({email, password, userAgent = 'github.com/jimhigson/ring-api', poll = true}) => {

    const events = new EventEmitter();

    restClient.authenticate( {email, password, userAgent} );

    const api = {
        devices: require( './get-devices-list' ),

        history: require( './get-history-list' ),

        activeDings: require( './get-active-dings' ),

        events
    };

    if( poll ) {
        require( './poll-for-dings.js' )( events, api );
    }

    return api;
};


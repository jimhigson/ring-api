'use strict'

const logger = require( 'debug' )( 'ring-api' )
const EventEmitter = require( 'events' )
const assign = require( 'lodash.assign' )

module.exports = ({
    email = process.env.RING_USER,
    password = process.env.RING_PASSWORD,
    userAgent = 'github.com/jimhigson/ring-api',
    poll = true,
    serverRoot = 'https://api.ring.com/clients_api' }) => {

    if ( !email || !password ) {
        throw new Error(
            'no username or password given. Either pass this in when creating' +
            'a ring-api instance, or set the RING_USER and RING_PASSWORD environment variables'
        )
    }

    const events = new EventEmitter()

    const apiUrls = require( './api-urls' )( serverRoot )

    const restClient = require( './rest-client' )( apiUrls )

    restClient.authenticate({ email, password, userAgent })

    const api = {
        events,
        apiUrls,
        restClient
    }

    assign( api, {
        devices: require( './get-devices-list' )( api ),

        history: require( './get-history-list' )( api ),

        activeDings: require( './get-active-dings' )( api ),
    })

    if ( poll ) {
        require( './poll-for-dings.js' )( api )
    }

    return api
}


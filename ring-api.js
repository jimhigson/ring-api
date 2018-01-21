'use strict'

const EventEmitter = require( 'events' )

module.exports = ({
    email = process.env.RING_USER,
    password = process.env.RING_PASSWORD,
    userAgent = 'github.com/jimhigson/ring-api',
    poll = true,
    serverRoot = 'https://api.ring.com/clients_api' }) => {

    if ( !email || !password ) {
        throw new Error(
            'no username or password given. Either pass this in when creating ' +
            'a ring-api instance, or set the RING_USER and RING_PASSWORD environment variables'
        )
    }

    const bottle = require( 'bottlejs' )()

    require( './api-urls' )( bottle )
    require( './rest-client' )( bottle )
    require( './get-history-list' )( bottle )
    require( './get-live-stream' )( bottle )
    require( './get-devices-list' )( bottle )
    require( './poll-for-dings' )( bottle )
    require( './get-active-dings' )( bottle )

    bottle.service( 'options', function() {
        return { email, password, userAgent, poll, serverRoot }
    })
    bottle.service( 'events', function() {
        return new EventEmitter()
    })
    bottle.service( 'logger', function() {
        return require( 'debug' )( 'ring-api' )
    })

    bottle.service( 'api', api,
        'getDevicesList',
        'getHistoryList',
        'getActiveDings',
        'events'
    )
    function api( getDevicesList, getHistoryList, getActiveDings, events ) {
        return {
            devices: getDevicesList,
            history: getHistoryList,
            activeDings: getActiveDings,
            events
        }
    }

    if ( poll ) {
        bottle.container.pollForDings.start()
    }

    bottle.container.restClient.authenticate()

    return bottle.container.api
}


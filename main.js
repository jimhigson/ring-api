'use strict'

const propagatedError = require( './propagated-error' )

module.exports = async({
    email = process.env.RING_USER,
    password = process.env.RING_PASSWORD,
    poll = true,
    serverRoot = 'https://api.ring.com' }) => {

    if ( !email || !password ) {
        throw new Error(
            'no username or password given. Either pass this in when creating ' +
            'a ring-api instance, or set the RING_USER and RING_PASSWORD environment variables'
        )
    }

    const bottle = require( 'bottlejs' )()

    bottle.service( 'options', function() {
        return { email, password, poll, serverRoot }
    })

    require( './wire-up' )( bottle )

    // wait until we have a session before going any further
    try {
        await bottle.container.restClient.session
    } catch ( e ) {
        throw propagatedError( 'session failed to initialise, cannot create ring-api instance', e )
    }

    if ( poll ) {
        bottle.container.pollForDings.start()
    }

    return bottle.container.api
}


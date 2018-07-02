'use strict'

module.exports = ({
    email = process.env.RING_USER,
    password = process.env.RING_PASSWORD,
    userAgent = 'github.com/jimhigson/ring-api',
    poll = true,
    serverRoot = 'https://api.ring.com' }) => {

    if ( !email || !password ) {
        throw new Error(
            'no username or password given. Either pass this in when creating ' +
            'a ring-api instance, or set the RING_USER and RING_PASSWORD environment variables'
        )
    }

    const bottle = require( 'bottlejs' )()

    bottle.service( 'options', function options() {
        return { email, password, userAgent, poll, serverRoot }
    })

    require( './wire-up' )( bottle )

    if ( poll ) {
        bottle.container.pollForDings.start()
    }

    return bottle.container.api
}


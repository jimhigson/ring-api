'use strict'

const SECOND = require( 'time-constants' ).SECOND
const logger = require( 'debug' )( 'ring-api' )

// polling every five seconds seems to be the rate the ring app uses:
const POLL_FREQUENCY = 5 * SECOND

module.exports = api => {

    const poll = async() => {
        const dings = await api.activeDings()

        logger( `polling found ${dings.length} active dings`, dings )

        dings.forEach( ding => api.events.emit( 'activity', ding ))
    }

    setInterval( poll, POLL_FREQUENCY )
}

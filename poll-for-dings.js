'use strict'

const SECOND = require( 'time-constants' ).SECOND

// polling every five seconds seems to be the rate the ring app uses:
const POLL_FREQUENCY = 5 * SECOND

module.exports = bottle => bottle.service( 'pollForDings', pollForDings,
    'getActiveDings',
    'events',
    'logger'
)

function pollForDings( getActiveDings, events, logger ) {

    const poll = async() => {
        const dings = await getActiveDings()

        logger( `polling found ${dings.length} active dings`, dings )

        dings.forEach( ding => events.emit( 'activity', ding ))
    }

    let interval

    return {
        start: () => {
            logger( `will poll for dings every ${POLL_FREQUENCY}ms` )
            interval = setInterval( poll, POLL_FREQUENCY )
        },
        stop: () => clearInterval( interval )
    }
}

'use strict'

module.exports = bottle => bottle.service( 'getLiveStream', getLiveStream,
    'restClient',
    'apiUrls',
    'getActiveDings',
    'logger'
)

function getLiveStream( restClient, apiUrls, getActiveDings, logger ) {
    return async device => {

        const first = require( 'lodash.first' )
        const maxTries = 10

        const waitForDing = async() => {

        // poll until the livestream is ready up to a maximum number of times
            for ( let tries = 0; tries < maxTries; tries++ ) {

                logger( `waiting for ding, attempt ${tries}` )

                const dings = await getActiveDings({ burst: true })

                const liveStreamDing = first( dings )

                if ( liveStreamDing ) {
                    return liveStreamDing
                }
            }

            throw new Error( `could not get a ding for this livestream after ${maxTries} attempts` )
        }

        // create a new live stream:
        const liveStreamUrl = apiUrls.doorbots().device( device ).liveStream()
        await restClient.authenticatedRequest( 'POST', liveStreamUrl )

        return waitForDing()
    }
}

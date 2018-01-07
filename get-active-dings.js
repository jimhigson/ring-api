'use strict'

const logger = require( 'debug' )( 'ring-api' )

module.exports = api => async({ burst = false } = { burst: false }) => {

    const dings = await api.restClient.authenticatedRequest(
        'GET',
        api.apiUrls.dings().active({ burst })
    )

    const parseDing = ding => {
        ding.now = new Date( ding.now / 1000 )
    }

    dings.forEach( parseDing )

    return dings
}

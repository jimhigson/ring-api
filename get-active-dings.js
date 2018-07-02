'use strict'

module.exports = bottle => bottle.service( 'getActiveDings', getActiveDings,
    'restClient',
    'apiUrls'
)

function getActiveDings( restClient, apiUrls ) {
    return async({ burst = false } = { burst: false }) => {

        const dings = await restClient(
            'GET',
            apiUrls.dings().active({ burst })
        )

        const parseDing = ding => {
            ding.now = new Date( ding.now / 1000 )
        }

        dings.forEach( parseDing )

        return dings
    }
}

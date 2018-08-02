const EventEmitter = require( 'events' )

module.exports = options => {

    const bottle = require( 'bottlejs' )()

    bottle.service( 'options', function() {
        return options
    })

    require( './api-urls' )( bottle )
    require( './rest-client' )( bottle )
    require( './get-history-list' )( bottle )
    require( './get-live-stream' )( bottle )
    require( './get-devices-list' )( bottle )
    require( './poll-for-dings' )( bottle )
    require( './get-active-dings' )( bottle )

    bottle.service( 'events', function() {
        return new EventEmitter()
    })
    bottle.service( 'logger', function() {
        return require( 'debug' )( 'ring-api' )
    })

    require( './top-level-api' )( bottle )

    return bottle.container
}

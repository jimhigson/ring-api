'use strict'

const assign = require( 'lodash.assign' )

/*

    A path generator made out of strings with methods:

    let u = require('./api-paths');

    > u
        -> String 'https://api.ring.com/clients_api'

    > u.doorbots().device( {id: 'foo123'} )
        -> String 'https://api.ring.com/clients_api/doorbots/foo123']

    > u.doorbots().device( {id: 'foo123'} ).lightsOn()
        -> String 'https://api.ring.com/clients_api/doorbots/foo123/floodlight_light_on'

    > u.chimes().device( {id: 'chime2'} ).health()
        -> String 'https://api.ring.com/clients_api/chimes/chime2/health

*/

module.exports = serverRoot => assign( '' + serverRoot, {

    session() {
        return `${this}/session`
    },

    devices() {
        return `${this}/ring_devices`
    },

    doorbots() {
        return assign( `${this}/doorbots`, {

            device( device ) {
                return assign( `${this}/${device.id}`, {

                    lightOn() {
                        return `${this}/floodlight_light_on`
                    },
                    lightOff() {
                        return `${this}/floodlight_light_off`
                    },
                    liveStream() {
                        return `${this}/vod`
                    },
                    health() {
                        return `${this}/health`
                    }
                })
            },

            history() {
                return `${this}/history`
            }
        })
    },

    dings() {
        return assign( `${this}/dings`, {

            ding( ding ) {
                return assign( `${this}/${ding.id}`, {

                    recording() {
                        return `${this}/recording?disable_redirect=true`
                    }
                })
            },

            active({ burst = false } = { burst: false }) {
                return `${this}/active?burst=${burst}`
            }
        })
    },

    chimes() {
        return assign( `${this}/chimes`, {

            device( device ) {
                return assign( `${this}/${device.id}`, {
                    health() {
                        return `${this}/health`
                    }
                })
            },

        })
    }

})

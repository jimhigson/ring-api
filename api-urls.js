'use strict';

const assign = require( 'lodash.assign' );

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

    session: function() { return `${this}/session` },

    devices: function() { return `${this}/ring_devices` },

    doorbots: function() { return assign( `${this}/doorbots`, {

        device: function( device ) { return assign( `${this}/${device.id}`, {

            lightOn: function() { return `${this}/floodlight_light_on` },
            lightOff: function() { return `${this}/floodlight_light_off` },
            liveStream: function() { return `${this}/vod` },
            health: function() { return `${this}/health` }
        } ) },

        history: function() { return `${this}/history` }
    } ) },

    dings: function() { return assign( `${this}/dings`, {

        ding: function( ding ) { return assign( `${this}/${ding.id}`, {

            recording: function() { return `${this}/recording?disable_redirect=true` }
        } ) },

        active: function( {burst=false}={burst:false} ) { return `${this}/active?burst=${burst}` }
    } ) },

    chimes: function() { return assign( `${this}/chimes`, {

        device: function( device ) { return assign( `${this}/${device.id}`, {
            health: function() { return `${this}/health` }
        } ) },

    } ) }

} );

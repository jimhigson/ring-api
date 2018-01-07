'use strict'

const mapKeys = require( 'lodash.mapkeys' )

// ring has strange names for things, replace them with more intuitive names for device types:
const makeDevicesListFriendlier = input => {

    const keyReplacements = {
        doorbots: 'doorbells',
        authorized_doorbots: 'authorisedDoorbells',
        stickup_cams: 'cameras',
        base_stations: 'baseStations',
        chimes: 'chimes'
    }

    return mapKeys( input, ( _, key ) => keyReplacements[ key ] || key )
}

const emojis = {
    chime: '🛎',
    hp_cam_v1: '📷💡',
    hp_cam_v2: '📷💡',
    lpd_v1: '🚪',
    lpd_v2: '🚪'
}

function deviceToString() {
    return `[ ${emojis[ this.kind ] || this.kind} "${this.description}" ]`
}

module.exports = api => async() => {

    const { restClient, apiUrls } = api

    const getLiveStream = require( './get-live-stream' )( api )
    const rawDeviceList = await restClient.authenticatedRequest( 'GET', apiUrls.devices())
    const devices = makeDevicesListFriendlier( rawDeviceList )

    const enhanceTypes = ( typesList, enhancer ) => {
        typesList.forEach( type => {
            devices[ type ].forEach( device =>
                enhancer( device, type ))
        })
    }

    enhanceTypes([ 'cameras' ], device => {
        const deviceUri = apiUrls.doorbots().device( device )
        device.lightOn = () => restClient.authenticatedRequest( 'PUT', deviceUri.lightOn())
        device.lightOff = () => restClient.authenticatedRequest( 'PUT', deviceUri.lightOff())
    })

    enhanceTypes([ 'cameras', 'doorbells' ], device => {
        device.liveStream = () => getLiveStream( device )
    })

    enhanceTypes([ 'cameras', 'doorbells', 'chimes' ], ( device, type ) => {
        // for getting health from the API, cams and doorbots are doorbots, but chimes
        // are chimes. ¯\_(ツ)_/¯
        const kludgedType = {
            'cameras': 'doorbots',
            'doorbells': 'doorbots',
            'chimes': 'chimes'
        }[ type ]

        const deviceHealthUrl = apiUrls[ kludgedType ]().device( device ).health()

        device.health = async() => {
            const healthResponse = await restClient.authenticatedRequest( 'GET', deviceHealthUrl )
            const deviceHealth = healthResponse.device_health

            deviceHealth.updated_at = new Date( deviceHealth.updated_at )

            return deviceHealth
        }
    })

    // convenience method to get an array of all devices
    devices.all = () => [].concat( devices.doorbells, devices.cameras, devices.chimes )

    devices.all().forEach( d => d.toString = deviceToString )

    return devices
}

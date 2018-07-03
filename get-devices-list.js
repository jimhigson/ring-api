'use strict'

// ring's client api has strange names for things, replace them with more intuitive names
// for device types
// ojbect here maps client api names to our exposed name
const keyReplacements = {
    doorbots: 'doorbells',
    authorized_doorbots: 'authorisedDoorbells',
    stickup_cams: 'cameras',
    base_stations: 'baseStations',
    chimes: 'chimes'
}

const emojis = {
    chime: '🛎',
    hp_cam_v1: '📷💡',
    hp_cam_v2: '📷💡',
    lpd_v1: '🚪',
    lpd_v2: '🚪'
}

module.exports = bottle => bottle.service( 'getDevicesList', getDevicesList,
    'restClient',
    'apiUrls',
    'getLiveStream'
)

function getDevicesList( restClient, apiUrls, getLiveStream ) {

    class DeviceHealth {
        constructor( jsonFromResponse ) {
            // a naieve copy like this could one day create a bug if Ring add property
            // names to their client API that shaddow our OOP methods
            Object.assign( this, jsonFromResponse )

            this.updated_at = new Date( jsonFromResponse.updated_at )
        }
    }

    class Device {
        constructor( jsonFromResponse ) {
            // a naieve copy like this could one day create a bug if Ring add property
            // names to their client API that shaddow our OOP methods
            Object.assign( this, jsonFromResponse )
        }

        toString() {
            return `[${emojis[ this.kind ] || this.kind} ${this.description}]`
        }

        get apiUri() {
            return apiUrls.doorbots().device( this )
        }

        async health() {
            const healthResponse = await restClient.authenticatedRequest( 'GET', this.apiUri.health())
            return new DeviceHealth( healthResponse.device_health )
        }
    }

    class Chime extends Device {
        get apiUri() {
            return apiUrls.chimes().device( this )
        }
    }

    const lightable = Base => class extends Base {
        lightOn() {
            return restClient.authenticatedRequest( 'PUT', this.apiUri.lightOn())
        }
        lightOff() {
            return restClient.authenticatedRequest( 'PUT', this.apiUri.lightOff())
        }
    }

    const streamable = Base => class extends Base {
        get liveStream() {
            return getLiveStream( this )
        }
    }

    const Doorbell = streamable( Device )
    const Camera = streamable( lightable( Device ))

    const types = {
        doorbells: Doorbell,
        cameras: Camera,
        chimes: Chime,
        baseStations: Device,
        authorisedDoorbells: Device
    }

    return async() => {

        const rawDeviceList = await restClient.authenticatedRequest( 'GET', apiUrls.devices())

        const listAsTypes = ( key, list ) => {
            if ( types[ key ]) {
                const Type = types[ key ]
                return list.map( d => new Type( d ))
            } else {
                return list
            }
        }

        const devices = Object.entries( rawDeviceList ).reduce(( acc, [ key, devicesList ]) => {
            const newKey = keyReplacements[ key ] || key

            return {
                ...acc,
                [ newKey ]: listAsTypes( newKey, devicesList )
            }
        }, {})

        // convenience property containing an array of all devices
        devices.all = [ ...devices.doorbells, ...devices.cameras, ...devices.chimes ]

        return devices
    }
}

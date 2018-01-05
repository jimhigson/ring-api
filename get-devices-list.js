'use strict';

const mapKeys = require('lodash.mapkeys');
const apiUrls = require('./api-urls');
const restClient = require( './rest-client' );

// ring has strange names for things, replace them with more intuitive names for device types:
const makeDevicesListFriendlier = input => {

    const keyReplacements = {
        doorbots: 'doorbells',
        authorized_doorbots: 'authorisedDoorbells',
        stickup_cams: 'cameras',
        base_stations: 'baseStations',
        chimes: 'chimes'
    };

    return mapKeys( input, (_, key) => keyReplacements[ key ] || key );
};

const emojis = {
    chime: '🛎',
    hp_cam_v1: '📷💡',
    hp_cam_v2: '📷💡',
    lpd_v1: '🚪',
    lpd_v2: '🚪'
};

function deviceToString() {
    return `[ ${emojis[this.kind] || this.kind} "${this.description}" ]`;
}

module.exports = async () => {

    const devices = makeDevicesListFriendlier( await restClient.authenticatedRequest( 'GET', apiUrls.devices() ) );

    const enhanceTypes = ( typesList, enhancer ) => {
        typesList.forEach( type => {
            devices[ type ].forEach( device =>
                enhancer( device, type ) );
        } );
    };

    enhanceTypes( ['cameras'], (device) => {
        const deviceUri = apiUrls.doorbots().device( device );
        device.lightOn = () => restClient.authenticatedRequest( 'PUT', deviceUri.lightOn() );
        device.lightOff = () => restClient.authenticatedRequest( 'PUT', deviceUri.lightOff() );
    } );

    enhanceTypes( ['cameras', 'doorbells'], (device) => {
        device.liveStream = () => require( './get-live-stream' )( device );
    } );

    enhanceTypes( ['cameras', 'doorbells', 'chimes'], (device, type) => {
        // for getting health from the API, cams and doorbots are doorbots, but chimes
        // are chimes. ¯\_(ツ)_/¯
        const kludgedType = {
            'cameras': 'doorbots',
            'doorbells': 'doorbots',
            'chimes': 'chimes'
        }[ type ];

        const healthEndpoint = apiUrls[kludgedType]().device( device ).health();

        device.health = async () => {
            const health = (await restClient.authenticatedRequest( 'GET', healthEndpoint )).device_health;

            health.updated_at = new Date( health.updated_at );

            return health;
        };
    } );

    // convenience method to get an array of all devices
    devices.all = () => [].concat( devices.doorbells, devices.cameras, devices.chimes );

    devices.all().forEach( d => d.toString = deviceToString );

    return devices;
};
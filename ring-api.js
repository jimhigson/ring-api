'use strict';

const apiUrls = require('./api-urls');
const restClient = require( './rest-client' );

const logger = require('debug')('ring-api');
const EventEmitter = require('events');

const mapKeys = require('lodash.mapkeys');

module.exports = ({email, password, userAgent = 'github.com/jimhigson/ring-api', poll = true}) => {

    const events = new EventEmitter();

    restClient.authenticate( {email, password, userAgent} );

    // ring has strange names for things, replace them with more intuitive names for device types:
    const makeDevicesListFriendlier = input => {

        const keyReplacements = {
            doorbots: 'doorbells',
            authorized_doorbots: 'authorisedDoorbells',
            stickup_cams: 'cameras',
            base_stations: 'baseStations'
        };

        return mapKeys( input, (_, key) => keyReplacements[ key ] || key );
    };

    const api = {
        devices: async () => {

            const devices = await restClient.authenticatedRequest( 'GET', apiUrls.devices() );

            const enhanceTypes = ( typesList, enhancer ) => {
                typesList.forEach( type => {
                    devices[ type ].forEach( device =>
                        enhancer( device, type ) );
                } );
            };

            enhanceTypes( ['stickup_cams'], (device) => {
                const deviceUri = apiUrls.doorbots().device( device );
                device.lightOn = () => restClient.authenticatedRequest( 'PUT', deviceUri.lightOn() );
                device.lightOff = () => restClient.authenticatedRequest( 'PUT', deviceUri.lightOff() );
            } );

            enhanceTypes( ['stickup_cams', 'doorbots'], (device) => {
                device.liveStream = () => require( './get-live-stream' )( device );
            } );

            enhanceTypes( ['stickup_cams', 'doorbots', 'chimes'], (device, type) => {
                // for getting health from the API, cams and doorbots are doorbots, but chimes
                // are chimes. ¯\_(ツ)_/¯
                const kludgedType = {
                    'stickup_cams': 'doorbots',
                    'doorbots': 'doorbots',
                    'chimes': 'chimes'
                }[ type ];

                const healthEndpoint = apiUrls[kludgedType]().device( device ).health();

                device.health = async () => {
                    const health = (await restClient.authenticatedRequest( 'GET', healthEndpoint )).device_health;

                    health.updated_at = new Date( health.updated_at );

                    return health;
                };
            } );

            return makeDevicesListFriendlier( devices );
        },

        history: async () => {
            const history = await restClient.authenticatedRequest( 'GET', apiUrls.doorbots().history() );

            history.forEach( historyItem => {
                historyItem.videoUrl = async () => {
                    const response = await restClient.authenticatedRequest(
                        'GET',
                        apiUrls.dings().ding( historyItem ).recording(),
                    );
                    return response.url;
                };
            } );

            return history;
        },

        activeDings: require( './get-active-dings' ),

        events
    };

    if( poll ) {
        require( './poll-for-dings.js' )( events, api );
    }

    return api;
};


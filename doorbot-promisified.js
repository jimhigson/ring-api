'use strict';

module.exports = options => {

    const doorbot = require('doorbot')( options );

    const promisifyMethod = methodName => (...args) => new Promise( (resolve, reject) => {
        args.push( (error, result) => {
            if( error ) {
                reject( error );
            } else {
                resolve( result );
            }
        } );

        doorbot[ methodName ].apply( doorbot, args );
    } );

    // the methods to be wrapped in promises without any other changes:
    const methodNames = [
        'recording',
        'dings',
        'lightOn',
        'lightOff',
        'lightToggle',

        // probably won't need these, but expose nontheless:
        'fetch',
        'simpleRequest',
        'authenticate'
    ];

    const api = methodNames.reduce( (obj, methodName) => {
        obj[ methodName ] = promisifyMethod( methodName );
        return obj;
    } , {} );

    // for devices and history, enhance the API to include methods in the cam objects:
    const getDevices = promisifyMethod( 'devices' );
    api.devices = async (...args) => {

        const devices = await getDevices(...args);

        const enhanceTypes = ( typesList, enhancer ) => {
            typesList.forEach( type => {
                devices[ type ].forEach( device =>
                    enhancer( device, type ) );
            } );
        };

        enhanceTypes( ['stickup_cams', 'doorbots', 'chimes'], (device, type) => {

            device._apiUrl = `/${type}/${device.id}`;
            device.simpleRequest = ( url, method ) => api.simpleRequest( `${device._apiUrl}${url}`, method );

            // for getting health from the API, cams and doorbots are doorbots, but chimes
            // are chimes.
            const cludgedTypes = {
                'stickup_cams': 'doorbots',
                'doorbots': 'doorbots',
                'chimes': 'chimes'
            };
            device.health = () => api.simpleRequest( `/${cludgedTypes[type]}/${device.id}/health`, 'GET' );
        } );

        // note that the streams don't work yet:
        /*
        enhanceTypes( ['stickup_cams', 'doorbots'], (device) => {
            device.stream = () => device.simpleRequest( '/vod', 'POST' );
        } );
        */

        enhanceTypes( ['stickup_cams'], (device) => {
            device.lightOn = () => api.lightOn( device );
            device.lightOff = () => api.lightOff( device );
            device.lightToggle = () => api.lightToggle( device );
        } );

        return devices;
    };


    const getHistory = promisifyMethod( 'history' );
    api.history = async (...args) => {

        const historyItems = await getHistory(...args);

        historyItems.forEach( historyItem => {
            historyItem.recording = () => api.recording( historyItem.id );
        } );

        return historyItems;
    };

    return api;
};


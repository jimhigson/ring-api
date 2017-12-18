'use strict';

const apiUrls = require('./api-urls');
const propagatedError = require( './propagated-error' );

const queryStringify = require('querystring').stringify;
const request = require("request-promise-native");
const delay = require('timeout-as-promise');

const logger = require('debug')('ring-api');
const EventEmitter = require('events');

const API_VERSION = 9;
const hardware_id = require("crypto").randomBytes(16).toString("hex");

module.exports = async ({email, password, userAgent = '@nodejs-node-api'}) => {



    const ringRequest = async reqData => {
        logger( 'making token request', reqData );

        const responseJson = await request( reqData );

        logger( 'got response', responseJson );

        return responseJson;
    };

    const getAuthToken = async () => {

        const body = {
            username: email,
            password,
            'device[os]': 'ios',
            'device[hardware_id]': hardware_id,
            api_version: API_VERSION
        };

        const headers = {
            Authorization: 'Basic ' + new Buffer(email + ':' + password).toString('base64'),
            'content-type': 'application/x-www-form-urlencoded',
            // d.headers['content-length'] = body.length;
            'user-agent': userAgent
        };

        const reqData = {
            uri: apiUrls.session(),
            body : queryStringify( body ),
            headers,
            json:true,
            method: 'POST'
        };

        let responseJson;
        try{
            responseJson = await ringRequest( reqData );
        } catch( e ) {
            throw propagatedError( `problem getting token for user ${email}`, e );
        }

        // delay copied from npm module doorbot - not sure what it is for
        await delay( 1500 );

        return responseJson.profile.authentication_token;
    };

    const authToken = await getAuthToken();

    logger( 'auth token is', authToken );

    const authenticatedRequest = async (method, uri, transform) => {

        const body = {
            api_version: API_VERSION,
            auth_token: authToken
        };

        const reqData = {
            method,
            uri,
            body,
            json:true,
            transform
        };

        let responseJson;
        try{
            responseJson = await ringRequest( reqData );
        } catch( e ) {
            throw propagatedError( `problem ${method}ing endpoint ${uri}`, e );
        }

        if( responseJson && responseJson.error ) {
            throw new Error( `error in API response ${responseJson.error}` );
        }

        return responseJson;
    };

    return {
        devices: async () => {

            const devices = await authenticatedRequest( 'GET', apiUrls.devices() );

            const enhanceTypes = ( typesList, enhancer ) => {
                typesList.forEach( type => {
                    devices[ type ].forEach( device =>
                        enhancer( device, type ) );
                } );
            };

            enhanceTypes( ['stickup_cams'], (device) => {
                const deviceUri = apiUrls.doorbots().device( device );
                device.lightOn = () => authenticatedRequest( 'PUT', deviceUri.lightOn() );
                device.lightOff = () => authenticatedRequest( 'PUT', deviceUri.lightOff() );
            } );

            // note that the streams don't work yet:
            enhanceTypes( ['stickup_cams', 'doorbots'], (device) => {
                device.stream = () => authenticatedRequest( 'POST', apiUrls.doorbots().device( device ).stream() );
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

                device.health = () => authenticatedRequest( 'GET', healthEndpoint );
            } );

            return devices;
        },

        history: async () => {
            const history = await authenticatedRequest( 'GET', apiUrls.doorbots().history() );

            const parseRecordingResponse = (body, res) => {
                return res.headers.location;
            };

            history.forEach( historyItem => {
                historyItem.recording = () =>
                    authenticatedRequest(
                        'GET',
                        apiUrls.dings().ding( historyItem ).recording(),
                        parseRecordingResponse
                    );
            } );

            return history;
        },

        activeDings: async () => authenticatedRequest( 'GET', apiUrls.dings().active() ),

        events: () => {

        }
    };

    /*
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
    */
};


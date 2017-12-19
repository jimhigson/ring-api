'use strict';

const apiUrls = require('./api-urls');
const propagatedError = require( './propagated-error' );

const queryStringify = require('querystring').stringify;
const request = require("request-promise-native");
const delay = require('timeout-as-promise');

const logger = require('debug')('ring-api');
const EventEmitter = require('events');

const isObject = require('lodash.isobject');

const API_VERSION = 9;
const hardware_id = require("crypto").randomBytes(16).toString("hex");

module.exports = async ({email, password, userAgent = 'github.com/jimhigson/ring-api', poll = true}) => {

    const events = new EventEmitter();

    const ringRequest = async reqData => {
        logger( 'making ring api request', reqData );

        reqData.transform = require( './parse-ring-json-responses' );

        reqData.headers = reqData.headers || {};

        if( isObject( reqData.body ) ) {
            reqData.body = JSON.stringify( reqData.body );
            reqData.headers['Content-type'] = 'application/json';
        }

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

        const token = responseJson.profile.authentication_token;

        logger( `have a new token for user ${email} ${token}` );

        return token;
    };

    const authToken = await getAuthToken();

    const authenticatedRequest = async (method, uri) => {

        const body = {
            api_version: API_VERSION,
            auth_token: authToken
        };

        const reqData = {
            method,
            uri,
            body
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

    const api = {
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
                historyItem.recordingUrl = async () => {
                    const response = await authenticatedRequest(
                        'GET',
                        apiUrls.dings().ding( historyItem ).recording(),
                    );
                    return response.url;
                };
            } );

            return history;
        },

        activeDings: async () => {
            const json = await authenticatedRequest( 'GET', apiUrls.dings().active() );

            const parseDing = ding => {
                ding.now = new Date( ding.now / 1000 );
                // the JSON parser won't have parsed ding.id correctly because Javascript has problems with
                // very large integers, so overwrite the failed parse with the string version that ring
                // provide for us:
                ding.id = ding.id_str;
            };

            json.forEach( parseDing );

            return json;
        },

        events
    };

    if( poll ) {
        require( './poll-for-dings.js' )( events, api );
    }

    return api;
};


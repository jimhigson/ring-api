'use strict';

const API_VERSION = 9;
const hardware_id = require("crypto").randomBytes(16).toString("hex");

const request = require("request-promise-native");
const delay = require('timeout-as-promise');
const isObject = require('lodash.isobject');
const propagatedError = require( './propagated-error' );
const queryStringify = require('querystring').stringify;
const sessionUrl = require('./api-urls').session();

const logger = require('debug')('ring-api');

let tokenResolve;
let tokenReject;
// this promise will be resolved when the token is available - some time after authenticate is called
const tokenPromise = new Promise( ( resolve, reject ) => {
    tokenResolve = resolve;
    tokenReject = reject;
} );

const ringRequest = async reqData => {

    reqData.transform = require( './parse-ring-json-responses' );

    reqData.headers = reqData.headers || {};

    if( isObject( reqData.body ) ) {
        reqData.body = JSON.stringify( reqData.body );
        reqData.headers['Content-type'] = 'application/json';
    }

    reqData.qs = reqData.qs || {};
    reqData.qs.api_version = API_VERSION;

    logger( 'making ring api request', reqData );

    const responseJson = await request( reqData );

    logger( 'got response', responseJson );

    return responseJson;
};


module.exports = {
    authenticate: async ({email, password, userAgent}) => {
        try{
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
                uri: sessionUrl,
                body : queryStringify( body ),
                headers,
                method: 'POST'
            };

            const responseJson = await ringRequest( reqData );

            // delay copied from npm module doorbot - not sure what it is for
            await delay( 1500 );

            const token = responseJson.profile.authentication_token;

            logger( `have a new token for user ${email} ${token}` );

            tokenResolve( token );
        } catch ( e ) {
            tokenReject(propagatedError( `problem getting token for user ${email}`, e ));
            throw propagatedError( `problem getting token for user ${email}`, e );
        }
    },
    makeRequest: async (method, uri) => {

        const body = {
            api_version: API_VERSION,
            // if a token has been gotten already, awaiting on tokenPromise will return right away:
            auth_token: await tokenPromise
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
    }
};
'use strict'

const API_VERSION = 11
const hardware_id = require( 'crypto' ).randomBytes( 16 ).toString( 'hex' )

const axios = require( 'axios' )
const delay = require( 'timeout-as-promise' )
const isObject = require( 'lodash.isobject' )
const compose = require( 'lodash.compose' )
const propagatedError = require( './propagated-error' )
const colors = require( 'colors/safe' )

const loggableObject = color => object => colors[ color ]( JSON.stringify( object, null, 4 ))

module.exports = bottle => bottle.service( 'restClient', restClient,
    'apiUrls',
    'options',
    'logger'
)
function restClient( apiUrls, { email, password }, logger ) {

    // axios responses are too verbose to log, make a smaller format by
    // extracting some properties
    const loggableResponseFields = ({ status, statusText, headers, data }) => ({
        status, statusText, headers, data
    })
    const loggableResponse = compose( loggableObject( 'cyan' ), loggableResponseFields )
    const loggableRequest = loggableObject( 'yellow' )

    const ringRequest = async({ method, url, headers = {}, data, params = {} }) => {

        const axiosParams = {
            transformResponse: [ require( './parse-ring-json-responses' ) ],
            method,
            url,
            params,
            data: isObject( data )
                ? JSON.stringify( data )
                : data,
            headers: isObject( data )
                ? {
                    'content-type': 'application/json',
                    'content-length': JSON.stringify( data ).length,
                    ...headers
                }
                : headers
        }

        try {
            logger( 'making request:', loggableRequest( axiosParams ))

            const axiosResponse = await axios( axiosParams )

            logger( 'got response:', loggableResponse( axiosResponse ), null, 4 )
            return axiosResponse.data
        } catch ( e ) {
            const response = e.response

            logger( colors.red( 'http request errored' ), e.response ? e.response.data : 'without response' )

            let message = `Request to ring API at ${url} failed`

            if ( response.data && response.data.error_description ) {
                // oauth errors
                message = `${message} with "${response.data.error_description}"`
            } else if ( response.data && response.data.error ) {
                // ring client api errors
                message = `${message} with "${response.data.error}"`
            }

            throw propagatedError( message, e )
        }
    }

    const authenticate = async() => {

        const authReqBody = {
            client_id: 'ring_official_android',
            grant_type: 'password',
            password: password,
            scope: 'client',
            username: email
        }
        const reqData = {
            url: apiUrls.auth(),
            data: authReqBody,
            method: 'POST'
        }

        let authToken
        try {
            authToken = ( await ringRequest( reqData )).access_token
        } catch ( requestError ) {
            throw propagatedError( `could not get auth token for user ${email}`, requestError )
        }

        logger( 'got auth token', colors.green( authToken ))

        return authToken
    }

    const establishSession = async authToken => {
        const sessionReqBody = {
            device: {
                hardware_id: hardware_id,
                metadata: {
                    api_version: API_VERSION,
                },
                os: 'android'
            }
        }
        const sessionReqHeaders = {
            Authorization: `Bearer ${authToken}`
        }
        const requestData = {
            url: apiUrls.session(),
            data: sessionReqBody,
            headers: sessionReqHeaders,
            method: 'POST',
            params: { api_version: API_VERSION }
        }

        let sessionToken
        try {
            sessionToken = ( await ringRequest( requestData )).profile.authentication_token
        } catch ( requestError ) {
            throw propagatedError( `could not get a session token given auth token ${authToken}`, requestError )
        }

        // delay copied from npm module doorbot - not sure what it is for
        await delay( 1500 )

        logger( 'got session token', colors.green( sessionToken ))

        return sessionToken
    }

    const authenticatedSession = async() => establishSession( await authenticate())

    const session = authenticatedSession()

    return {
        // await on .session to be sure that are authenticated
        session,

        authenticatedRequest: async( method, url ) => {
            const sessionToken = await session

            const authFields = {
                api_version: API_VERSION,
                auth_token: sessionToken
            }

            const reqData = {
                method,
                url,
                data: authFields,
                params: authFields,
                headers: { 'user-agent': 'android:com.ringapp:2.0.67(423)' }
            }

            let responseJson
            try {
                responseJson = await ringRequest( reqData )
            } catch ( e ) {
                throw propagatedError( `problem ${method}ing endpoint ${url}`, e )
            }

            if ( responseJson && responseJson.error ) {
                throw new Error( `error in API response ${responseJson.error}` )
            }

            return responseJson
        }
    }
}

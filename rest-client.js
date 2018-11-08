'use strict'

const API_VERSION = 11
const hardware_id = require( 'crypto' ).randomBytes( 16 ).toString( 'hex' )

const axios = require( 'axios' )
const delay = require( 'timeout-as-promise' )
const isObject = require( 'lodash.isobject' )
const compose = require( 'lodash.compose' )
const propagatedError = require( './propagated-error' )
const colors = require( 'colors/safe' )
const querystring = require( 'querystring' )

const loggableObject = color => object => colors[ color ]( JSON.stringify( object, null, 4 ))
const ringErrorCodes = {
    7050: 'NO_ASSET',
    7019: 'ASSET_OFFLINE',
    7061: 'ASSET_CELL_BACKUP',
    7062: 'UPDATING',
    7063: 'MAINTENANCE'
}

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

    const ringRequest = async options => {
        const { method, url, headers = {}, data, params = {} } = options
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
            const response = e.response || {}

            if ( e.code === 'ENOTFOUND' ) {
                logger( colors.red( `http request failed.  ${url} not found.  Trying again in 5 seconds` ))
                await delay( 5000 )
                return ringRequest( options )
            }

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

        logger( 'got session token', colors.green( sessionToken ))

        return sessionToken
    }

    let authToken = authenticate()
    const reauthenticate = () => {
        authToken = authenticate()
    }

    const authenticatedSession = async() => establishSession( await authToken )

    const session = authenticatedSession()

    return {
        // await on .session to be sure that are authenticated
        session,

        authenticatedRequest: async( method, url, data, headers = {}) => {
            const sessionToken = await session

            const authFields = {
                api_version: API_VERSION,
                auth_token: sessionToken
            }

            const reqData = {
                method,
                url,
                data: data || authFields,
                params: authFields,
                headers: Object.assign({ 'user-agent': 'android:com.ringapp:2.0.67(423)' }, headers )
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
        },

        async oauthRequest( method, url, data ) {
            try {
                const token = await authToken
                const headers = {
                    'content-type': 'application/x-www-form-urlencoded',
                    authorization: `Bearer ${token}`
                }

                return await ringRequest({
                    method,
                    url,
                    data: querystring.stringify( data ),
                    headers
                })

            } catch ( e ) {
                const response = e.causedBy && e.causedBy.response

                if ( response && response.status === 401 ) {
                    reauthenticate()
                    return this.oauthRequest( method, url, data )
                }

                if ( response && response.status === 404
                    && response.data && Array.isArray( response.data.errors )) {
                    const
                        errors = response.data.errors,
                        errorText = errors.map( code => ringErrorCodes[ code ]).filter( x => x ).join( ', ' )

                    if ( errorText ) {
                        logger( colors.red( `http request failed.  ${url} returned errors: (${errorText}).  Trying again in 20 seconds` ))

                        await delay( 20000 )
                        return this.oauthRequest( method, url, data )
                    } else {
                        logger( colors.red( `http request failed.  ${url} returned unknown errors: (${errors}).  Trying again in 20 seconds` ))
                    }
                }

                throw e
            }
        }
    }
}

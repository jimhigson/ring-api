'use strict'

const API_VERSION = 9
const hardware_id = require( 'crypto' ).randomBytes( 16 ).toString( 'hex' )

const axios = require( 'axios' )
const delay = require( 'timeout-as-promise' )
const isObject = require( 'lodash.isobject' )
const propagatedError = require( './propagated-error' )
const colors = require( 'colors/safe' )

module.exports = bottle => bottle.service( 'restClient', restClient,
    'apiUrls',
    'options',
    'logger'
)
function restClient( apiUrls, options, logger ) {

    const ringRequest = async reqData => {

        reqData.transformResponse = [ require( './parse-ring-json-responses' ) ]

        reqData.headers = reqData.headers || {}

        if ( isObject( reqData.data )) {
            reqData.data = JSON.stringify( reqData.data )
            reqData.headers[ 'Content-type' ] = 'application/json'
        }

        reqData.params = reqData.params || {}
        reqData.params.api_version = API_VERSION

        logger( 'making ring api request', reqData )

        try {
            const responseJson = await axios( reqData )

            logger( 'got response', responseJson )
            return responseJson.data
        } catch ( e ) {
            const response = e.response

            logger( colors.red( 'request errored' ), e.response ? e.response.data : 'without response' )

            let message = `Request to ring API at ${reqData.url} failed`

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
        const { email, password, userAgent } = options

        const authReqBody = {
            'client_id': userAgent,
            'grant_type': 'password',
            'password': password,
            'scope': 'client',
            'username': email
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

        logger( colors.green( 'got auth token', authToken ))

        return authToken
    }

    const establishSession = async authToken => {
        const sessionReqBody = {
            device: {
                'hardware_id': hardware_id,
                'metadata': {
                    'api_version': '9',
                },
                'os': 'ios'
            }
        }
        const sessionReqHeaders = {
            Authorization: `bearer ${authToken}`
        }
        const requestData = {
            url: apiUrls.session(),
            data: sessionReqBody,
            headers: sessionReqHeaders,
            method: 'POST'
        }

        let sessionToken
        try {
            sessionToken = ( await ringRequest( requestData )).profile.authentication_token
        } catch ( requestError ) {
            throw propagatedError( `could not get a session token given auth token ${authToken}`, requestError )
        }

        // delay copied from npm module doorbot - not sure what it is for
        await delay( 1500 )

        logger( colors.green( 'got session token', sessionToken ))

        return sessionToken
    }

    const authenticatedSession = async() => establishSession( await authenticate())

    const session = authenticatedSession()

    return {
        // await on .session to be sure that are authenticated
        session,

        authenticatedRequest: async( method, url ) => {
            const reqBodyData = {
                api_version: API_VERSION,
                auth_token: await session
            }

            const reqData = {
                method,
                url,
                data: reqBodyData
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

'use strict'

const API_VERSION = 9
const hardware_id = require( 'crypto' ).randomBytes( 16 ).toString( 'hex' )

const axios = require( 'axios' )
const delay = require( 'timeout-as-promise' )
const isObject = require( 'lodash.isobject' )
const propagatedError = require( './propagated-error' )
const queryStringify = require( 'querystring' ).stringify

const logger = require( 'debug' )( 'ring-api' )

let tokenResolve
let tokenReject
// this promise will be resolved when the token is available - some time after authenticate
// is called
const tokenPromise = new Promise(( resolve, reject ) => {
    tokenResolve = resolve
    tokenReject = reject
})

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

    const responseJson = await axios( reqData )

    logger( 'got response', responseJson )

    return responseJson.data
}


module.exports = apiUrls => ({
    authenticate: async({ email, password, userAgent }) => {
        const sessionApiUrl = apiUrls.session()
        try {
            const reqBodyData = {
                username: email,
                password,
                'device[os]': 'ios',
                'device[hardware_id]': hardware_id,
                api_version: API_VERSION
            }

            const headers = {
                Authorization: 'Basic ' + new Buffer( email + ':' + password ).toString( 'base64' ),
                'content-type': 'application/x-www-form-urlencoded',
                'user-agent': userAgent
            }

            const reqData = {
                url: sessionApiUrl,
                data: queryStringify( reqBodyData ),
                headers,
                method: 'POST'
            }

            const responseJson = await ringRequest( reqData )

            // delay copied from npm module doorbot - not sure what it is for
            await delay( 1500 )

            const token = responseJson.profile.authentication_token

            logger( `have a new token for user ${email} ${token}` )

            tokenResolve( token )
        } catch ( upstreamError ) {

            const errorMessage = `problem getting token for user ${email} from URL ${sessionApiUrl}`
            const downstreamError = propagatedError(
                errorMessage,
                upstreamError
            );
            tokenReject( downstreamError )
        }
    },
    authenticatedRequest: async( method, url ) => {

        const reqBodyData = {
            api_version: API_VERSION,
            // if a token has been gotten already, awaiting on tokenPromise will return very
            // quickly, otherwise will wait until we have a token to do this:
            auth_token: await tokenPromise
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
})

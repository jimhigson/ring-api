'use strict'

const API_VERSION = 9
const hardware_id = require( 'crypto' ).randomBytes( 16 ).toString( 'hex' )

const axios = require( 'axios' )
const delay = require( 'timeout-as-promise' )
const isObject = require( 'lodash.isobject' )
const propagatedError = require( './propagated-error' )
const colors = require('colors/safe')

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
            logger( colors.red( 'request errored' ), e.response.data )
            throw e
        }
    }

    const authenticate = async () => {
        const { email, password } = options

        const authReqBody = {
            "client_id": "http://github.com/jimhigson/ring-api",
            "grant_type": "password",
            "password": password,
            "scope": "client",
            "username": email
        }
        const reqData = {
            url: apiUrls.auth(),
            data: authReqBody,
            method: 'POST'
        }

        const authToken = (await ringRequest( reqData )).access_token

        logger( colors.green('got auth token', authToken ))

        return authToken
    }

    const establishSession = async authToken => {
        const sessionReqBody = {
            device: {
                "hardware_id": hardware_id,
                "metadata": {
                    "api_version": "9",
                },
                "os": "ios"
            }
        }
        const sessionReqHeaders = {
            Authorization: `bearer ${authToken}`
        }

        const sessionResponse = await ringRequest( {
            url:  apiUrls.session(),
            data: sessionReqBody,
            headers: sessionReqHeaders,
            method: 'POST'
        } )    

        // delay copied from npm module doorbot - not sure what it is for
        await delay( 1500 )

        const sessionToken = sessionResponse.profile.authentication_token

        logger( colors.green('got session token', sessionToken))

        return sessionToken
    }

    const session = new Promise( async (resolve, reject) => {                    
        try {
            resolve( 
                await establishSession( 
                    await authenticate() 
                ) 
            )
        } catch ( caughtError ) {
            const errorMessage = `problem getting token`

            const thrownError = propagatedError(
                errorMessage,
                caughtError
            )
            reject( thrownError )
        }
    })

    return {
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

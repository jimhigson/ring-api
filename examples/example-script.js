#!/usr/bin/env node
'use strict'

// if outside of this codebase, use require('ring-api' instaed)
const ringApi = require( '../main' )
const { healthSummary, historySummary } = require( './formatters' )
const { inspect } = require( 'util' )

const prompt = require( 'node-ask' ).prompt

if ( !process.env.RING_USER || !process.env.RING_PASSWORD ) {
    console.error( 'this example needs ring username and password in the environment' )
    process.exit()
}

const main = async() => {

    try {
        const ring = await ringApi({
            // we'll use the default options for this example. Maks sure you have the
            // username and password as RING_USER or RING_PASSWORD or place them here
        })

        console.log( '🎵active dings now are', await ring.activeDings())

        const devices = await ring.devices()

        if ( devices.cameras.length ) {
            await Promise.all( devices.cameras.map( async c => {

                await c.lightOn()
                console.log( `${c.toString()} is now on'` )
            }))

            await prompt( 'your lights should now all be on. Hit return ⏎ to turn them off again' )

            await Promise.all( devices.cameras.map( async c => {
                await c.lightOff()
                console.log( `${c.toString()} 💡 is now off'` )
            }))
        } else {
            console.log( 'you have no devices with lights 💡 that I can turn on' )
        }

        console.log()
        console.log( '📹details for latest live stream:\n', inspect( await devices.doorbells[ 0 ].liveStream, { colors: true }))

        const healthSummaries = await Promise.all( devices.all.map( healthSummary ))
        console.log( '\nDevice Healths\n===============\n', healthSummaries.join( '\n' ))

        const history = await ring.history()
        console.log( historySummary( history ))

        const videos = await Promise.all( history.map( h => h.videoUrl()))
        console.log( `your most recent 3 videos 📹 are at...\n\t ${videos.slice( 0, 3 ).join( '\n\t' )}` )

        ring.events.on( 'activity', ding => console.log( '\t🎵there is a ding', ding ))
        console.log()
        console.log( 'now listening for dings, they will log here until you kill this script. Go press your doorbell!' )
    } catch ( e ) {
        console.error( e )
    }
}

main()

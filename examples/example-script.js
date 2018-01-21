#!/usr/bin/env node
'use strict'

const ringApi = require( '../ring-api' )

const inspect = require( 'util' ).inspect
const prompt = require( 'node-ask' ).prompt

const printHealth = async device => {
    console.log( `
device ${device.toString()} health
----------------------------------

${inspect( await device.health(), { depth: 1 })}            
` )
}

const historySummary = history => `
history list
------------
${history.map( h => h.toString()).join( '\n' ) }
`

if ( !process.env.RING_USER || !process.env.RING_PASSWORD ) {
    console.error( 'this example needs ring username and password in the environment' )
    process.exit()
}

const ring = ringApi({
    // we'll use the default options for this example
})

const main = async() => {

    try {
        console.log( '🎵active dings now are', await ring.activeDings())

        ring.events.on( 'activity', ding => console.log( '\t🎵there is a ding', ding ))
        console.log( '🎵now listening for dings' )

        const devices = await ring.devices()

        await Promise.all( devices.cameras.map( async c => {

            await c.lightOn()
            console.log( `${c.toString()} is now on'` )
        }))

        await prompt( 'your lights should now all be on. Hit return ⏎ to turn them off again' )

        await Promise.all( devices.cameras.map( async c => {
            await c.lightOff()
            console.log( `${c.toString()} 💡 is now off'` )
        }))

        console.log( '📹details for latest live stream...', await devices.doorbells[ 0 ].liveStream())

        devices.all().forEach( printHealth )

        const history = await ring.history()
        console.log( historySummary( history ))

        const videos = await Promise.all( history.map( h => h.videoUrl()))
        console.log( `your videos 📹 are at...\n\t ${videos.join( '\n\t' )}` )
    } catch ( e ) {
        console.error( e )
    }
}

main()

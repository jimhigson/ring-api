const {inspect} = require( 'util' )

const healthSummary = async device => `
device ${device.toString()} health
----------------------------------

${inspect( await device.health(), { depth: 1, colors:true })}            
`

const historySummary = history => `
history list
------------
${history.map( h => h.toString()).join( '\n' ) }
`

module.exports = {
    healthSummary, historySummary
}
'use strict'

const { yellow } = require( 'colors/safe' )
const causePointer = yellow( '--caused-by->' )

const combinedMessage = error => {
    if ( error.isPropagatedError ) {
        return `${error.ownMessage} ${causePointer} ${combinedMessage( error.causedBy )}`
    } else {
        return error.message
    }
}

module.exports = ( message, causedBy ) => {

    const nativeMessage = combinedMessage({ isPropagatedError: true, ownMessage: message, causedBy })

    const error = new Error( nativeMessage )

    error.ownMessage = message
    error.causedBy = causedBy
    error.isPropagatedError = true

    return error
}

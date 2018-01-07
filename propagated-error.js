'use strict'

module.exports = ( message, originalError ) =>
    new Error( `${message} ${originalError.message} :: ${originalError.stack} \n---try/catch/throw---` )

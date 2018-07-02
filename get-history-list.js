'use strict'

function parseDate( dateStr ) {

    const date = new Date( dateStr )

    if ( isNaN( date.getTime())) {
        throw new Error( `"${dateStr}" could not be parsed using Date constructor` )
    }

    return date
}

const emojis = {
    motion: '🏃',
    ding: '🛎',
    on_demand: '📱'
}

module.exports = bottle => bottle.service( 'getHistoryList', getHistoryList,
    'restClient',
    'apiUrls'
)
function getHistoryList( restClient, apiUrls ) {

    class HistoryItem {

        constructor( jsonFromResponse ) {
            // a naieve copy like this could one day create a bug if Ring add property 
            // names to their client API that shaddow our OOP methods
            Object.assign( this, jsonFromResponse )

            this.created_at = parseDate( jsonFromResponse.created_at )
        }

        get apiUri() {
            return apiUrls.dings().ding( this )
        }

        async videoUrl () {
            const response = await restClient( 'GET', this.apiUri.recording() )
            return response.url
        }

        toString() {
            return `[${this.kind} ${emojis[ this.kind ] || ''} at "${this.doorbot.description}" ${this.created_at}]`
        }
    }

    return async() => {
        const historyListUrl = apiUrls.doorbots().history()
        const historyItems = await restClient( 'GET', historyListUrl )

        return historyItems.map( h => new HistoryItem(h) )
    }
}


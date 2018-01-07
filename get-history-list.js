'use strict';

const emojis = {
    motion: '🏃',
    ding: '🛎',
    on_demand: '📱'
};

function historyToString() {
    return `[ ${this.kind} ${emojis[this.kind] || ''} at "${this.doorbot.description}" ${this.created_at} ]`;
}

function parseDate( dateStr ) {

    const date = new Date( dateStr );

    if( isNaN( date.getTime() ) ) {
        throw new Error( `"${dateStr}" could not be parsed using Date constructor` );
    }

    return date;
}

module.exports = api => async () => {
    const historyItems = await api.restClient.authenticatedRequest( 'GET', api.apiUrls.doorbots().history() );

    historyItems.forEach( historyItem => {
        historyItem.videoUrl = async () => {
            const response = await api.restClient.authenticatedRequest(
                'GET',
                api.apiUrls.dings().ding( historyItem ).recording(),
            );
            return response.url;
        };
    } );

    historyItems.forEach( h => {
        h.created_at = parseDate( h.created_at );
    });

    historyItems.forEach( h => h.toString = historyToString );

    return historyItems;
};
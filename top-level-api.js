'use strict'

module.exports = bottle => {

    bottle.service( 'api', api,
        'getDevicesList',
        'getHistoryList',
        'getActiveDings',
        'events'
    )

    function api( getDevicesList, getHistoryList, getActiveDings, events ) {
        return {
            devices: getDevicesList,
            history: getHistoryList,
            activeDings: getActiveDings,
            events
        }
    }
}


'use strict'

module.exports = bottle => {

    bottle.service( 'api', api,
        'getDevicesList',
        'getHistoryList',
        'getActiveDings',
        'getAlarms',
        'events'
    )

    function api( getDevicesList, getHistoryList, getActiveDings, getAlarms, events ) {
        return {
            devices: getDevicesList,
            history: getHistoryList,
            activeDings: getActiveDings,
            alarms: getAlarms,
            events
        }
    }
}


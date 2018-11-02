'use strict'

const io = require( 'socket.io-client' )
const { Subject, BehaviorSubject } = require( 'rxjs' )
const { filter, take, map, concatMap, distinctUntilChanged, publishReplay, scan } = require( 'rxjs/operators' )
const unique = require( 'lodash.uniq' )
const delay = require( 'timeout-as-promise' )

module.exports = bottle => bottle.service( 'getAlarms', getAlarms,
    'restClient',
    'apiUrls',
    'getDevicesList',
    'logger'
)

const DeviceType = {
        BaseStation: 'hub.redsky',
        Keypad: 'security-keypad',
        SecurityPanel: 'security-panel',
        ContactSensor: 'sensor.contact',
        MotionSensor: 'sensor.motion',
        RangeExtender: 'range-extender.zwave',
        ZigbeeAdapter: 'adapter.zigbee',
        AccessCodeVault: 'access-code.vault',
        AccessCode: 'access-code',
    },
    deviceListMessageType = 'DeviceInfoDocGetList'

module.exports.AlarmDeviceType = DeviceType

const deviceTypesWithVolume = [ DeviceType.BaseStation, DeviceType.Keypad ]

function flattenDeviceData( data ) {
    return Object.assign(
        {},
        data.general && data.general.v2,
        data.device && data.device.v1
    )
}

function getAlarms( restClient, apiUrls, getDeviceList, logger ) {

    class Device {
        constructor( initialData, alarm ) {
            this.zid = initialData.zid
            this.onData = new BehaviorSubject( initialData )
            this.alarm = alarm

            alarm.onDeviceDataUpdate
                .pipe(
                    filter( update => {
                        return update.zid === this.zid
                    })
                )
                .subscribe( update => this.updateData( update ))
        }

        updateData( update ) {
            this.onData.next( Object.assign({}, this.data, update ))
        }

        get data() {
            return this.onData.getValue()
        }

        get supportsVolume() {
            return deviceTypesWithVolume.includes( this.data.deviceType )
                && this.data.volume !== undefined
        }


        setVolume( volume ) {
            if ( isNaN( volume ) || volume < 0 || volume > 1 ) {
                throw new Error( 'Volume must be between 0 and 1' )
            }

            if ( !this.supportsVolume ) {
                throw new Error( `Volume can only be set on ${deviceTypesWithVolume.join( ', ' )}` )
            }

            this.alarm.setDeviceInfo( this.zid, { device: { v1: { volume } } })
        }

        toString() {
            return this.toJSON()
        }

        toJSON() {
            return JSON.stringify({
                data: this.data
            }, null, 2 )
        }
    }

    class Alarm {
        constructor( locationId ) {
            this.locationId = locationId
            this.seq = 1
            this.onMessage = new Subject()
            this.onDataUpdate = new Subject()
            this.onDeviceDataUpdate = this.onDataUpdate
                .pipe(
                    filter( message => {
                        return message.datatype === 'DeviceInfoDocType' && Boolean( message.body )
                    }),
                    concatMap( message => message.body ),
                    map( flattenDeviceData )
                )
            this.onDeviceList = this.onMessage
                .pipe(
                    filter( m => m.msg === deviceListMessageType ),
                    map( m => m.body )
                )
            this.onDevices = this.onDeviceList
                .pipe(
                    scan(( devices, deviceList ) => {
                        return deviceList.reduce(( updatedDevices, data ) => {
                            const flatData = flattenDeviceData( data ),
                                existingDevice = updatedDevices.find( x => x.zid === flatData.zid )

                            if ( existingDevice ) {
                                existingDevice.updateData( flatData )
                                return updatedDevices
                            }

                            return [ ...updatedDevices, new Device( flatData, this ) ]
                        }, devices )
                    }, []),
                    distinctUntilChanged(( a, b ) => a.length === b.length ),
                    publishReplay( 1 )
                )

            // start listening for devices immediately
            this.onDevices.connect()
        }

        async createConnection() {
            logger( 'Creating alarm socket.io connection' )
            const connectionDetails = await restClient.oauthRequest( 'POST', apiUrls.connections(), {
                accountId: this.locationId
            })

            const connection = io.connect( `wss://${connectionDetails.server}/?authcode=${connectionDetails.authCode}` )
            const reconnect = () => {
                if ( this.reconnecting && this.connectionPromise ) {
                    return this.connectionPromise
                }

                logger( 'Reconnecting alarm socket.io connection' )
                this.reconnecting = true
                connection.close()
                return this.connectionPromise = delay( 1000 ).then(() => this.createConnection())
            }

            this.reconnecting = false
            connection.on( 'DataUpdate', message => {
                if ( message.datatype === 'HubDisconnectionEventType' ) {
                    logger( 'Alarm connection told to reconnect' )
                    return reconnect()
                }

                this.onDataUpdate.next( message )
            })
            connection.on( 'message', message => this.onMessage.next( message ))
            connection.on( 'error', reconnect )
            return new Promise(( resolve, reject ) => {
                connection.once( 'connect', () => {
                    resolve( connection )
                    logger( 'Ring alarm connected to socket.io server' )
                    this.requestList( deviceListMessageType )
                })
                connection.once( 'error', reject )
            }).catch( reconnect )
        }

        async getConnection() {
            if ( this.connectionPromise ) {
                return this.connectionPromise
            }

            return this.connectionPromise = this.createConnection()
        }

        async sendMessage( message ) {
            const connection = await this.getConnection()
            message.seq = this.seq++
            connection.emit( 'message', message )
        }

        setDeviceInfo( zid, body ) {
            return this.sendMessage({
                msg: 'DeviceInfoSet',
                datatype: 'DeviceInfoSetType',
                body: [
                    {
                        zid,
                        ...body
                    }
                ]
            })
        }

        async setAlarmMode( alarmMode, bypassSensorZids ) {
            const zid = await this.getSecurityPanelZid()
            return this.setDeviceInfo( zid, {
                command: {
                    v1: [
                        {
                            commandType: 'security-panel.switch-mode',
                            data: {
                                mode: alarmMode,
                                bypass: bypassSensorZids
                            }
                        }
                    ]
                }
            })
        }

        getNextMessageOfType( type ) {
            return this.onMessage.pipe(
                filter( m => m.msg === type ),
                map( m => m.body ),
                take( 1 )
            ).toPromise()
        }

        requestList( listType ) {
            this.sendMessage({ msg: listType })
        }

        getList( listType ) {
            this.requestList( listType )
            return this.getNextMessageOfType( listType )
        }

        getDevices() {
            if ( !this.connectionPromise ) {
                this.getConnection()
            }

            return this.onDevices.pipe(
                take( 1 )
            ).toPromise()
        }

        getRoomList() {
            return this.getList( 'RoomGetList' )
        }

        async getSecurityPanelZid() {
            if ( this.securityPanelZid ) {
                return this.securityPanelZid
            }

            const devices = await this.getDevices()
            const securityPanel = devices.find( device => {
                return device.data.deviceType === DeviceType.SecurityPanel
            })

            if ( !securityPanel ) {
                throw new Error( `Could not find a security panel for location ${this.locationId}` )
            }

            return this.securityPanelZid = securityPanel.zid
        }

        disarm() {
            return this.setAlarmMode( 'none' )
        }

        armHome( bypassSensorZids ) {
            return this.setAlarmMode( 'some', bypassSensorZids )
        }

        armAway( bypassSensorZids ) {
            return this.setAlarmMode( 'all', bypassSensorZids )
        }
    }

    return async() => {
        const devices = await getDeviceList()
        const baseStations = devices.baseStations
        const locationIds = baseStations.map( baseStation => baseStation.location_id )

        return unique( locationIds ).map( locationId => new Alarm( locationId ))
    }
}


import { Observable } from 'rxjs'

declare namespace RingApi {
    interface Config {
        email: string
        password: string
        poll?: boolean
        serverRoot?: string
    }

    enum AlarmDeviceType {
        BaseStation = 'hub.redsky',
        Keypad = 'security-keypad',
        SecurityPanel = 'security-panel',
        ContactSensor = 'sensor.contact',
        MotionSensor = 'sensor.motion',
        RangeExtender = 'range-extender.zwave',
        ZigbeeAdapter = 'adapter.zigbee',
        AccessCodeVault = 'access-code.vault',
        AccessCode = 'access-code',
    }

    interface AlarmDeviceData {
        zid: string
        name: string
        deviceType: AlarmDeviceType
        batteryLevel?: number
        batteryStatus: 'full' | 'ok' | 'low' | 'none' | 'charging'
        batteryBackup?: 'charged' | 'charging'
        manufacturerName?: string
        serialNumber?: string
        tamperStatus: 'ok' | 'tamper'
        faulted?: boolean
        locked?: 'jammed' | 'locked' | 'unlocked' | 'unknown'
        roomId?: number
        volume?: number
        mode?: 'all' | 'some' | 'none'
        alarmInfo?: {
            state: 'burglar-alarm' | 'entry-delay'
            faultedDevices?: string[]
            timestamp?: number
            uuid?: string
        }
    }

    interface AlarmDevice {
        zid: string
        onData: Observable<AlarmDeviceData>
        data: AlarmDeviceData
        alarm: Alarm

        supportsVolume: boolean
        setVolume (volume: number): void
    }

    interface Alarm {
        locationId: string
        onDataUpdate: Observable<any>
        onDeviceDataUpdate: Observable<AlarmDeviceData>

        getDevices (): Promise<AlarmDevice[]>
        onDevices (): Observable<AlarmDevice[]>
        requestList (listType: string): void
        getList <T = any> (listType: string): Promise<T[]>
        getNextMessageOfType <T = any> (type: string): Promise<T>
        sendMessage (message: any): Promise<void>
        setDeviceInfo (zid: string, body: any): Promise<void>
        getRoomList (): Promise<{ id: number, name: string }>
        disarm (): Promise<void>
        armHome (bypassSensorZids?: string[]): Promise<void>
        armAway (bypassSensorZids?: string[]): Promise<void>
    }

    interface Api {
        alarms (): Promise<Alarm[]>
    }
}

declare function RingApi (config: RingApi.Config): Promise<RingApi.Api>
export = RingApi

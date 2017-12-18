
Ring API
===

An unofficial, friendly Node.js API for [ring](http://ring.com) doorbells, cameras, etc

usage
---

```js
// pass any options that doorbot accepts:
const RingApi = require( 'ring-api' );
const ringApi =  RingApi( {
    email: 'you@example.com',
    password: 'password you use on ring.com',

    // OPTIONAL: any user agent you want to use default is github url of this project: 'http://github.com/jimhigson/ring-api'
    userAgent: '',

    // OPTIONAL: if true, will poll behind the scenes. Listening for events only works if this is on.
    // true by default.
    poll: true/false
} );
```

Listening for activity on your ring devices
---

```js
ringApi.events.on('activity', activity => console.log( 'there is a activity', activity ));
```

The event will be fired on rings and motion detected. To distinguish between then, use the activity.kind
property.

Where the activity object looks like:

```js
{
   id: '6500907085284961754', // note - this will be a string - Javascript can't do large integers so well
   id_str: '6500907085284961754', // same as id
   state: 'ringing',
   protocol: 'sip',
   doorbot_id: 3861978, // id of the device that is ringing
   doorbot_description: 'Back garden',
   device_kind: 'hp_cam_v1',
   motion: true,
   snapshot_url: '',  // seems to always be blank
   kind: 'motion',  // 'motion' or 'ring'
   expires_in: 175,
   now: Date, // js Date object
   optimization_level: 1,

   // various sip-related fields for the video:
   sip_server_ip: '...',
   sip_server_port: 15063,
   sip_server_tls: true,
   sip_session_id: '...',
   sip_from: '...',
   sip_to: '..',
   audio_jitter_buffer_ms: 300,
   video_jitter_buffer_ms: 300,
   sip_endpoints: null,
   sip_token: 'long hex token',
   sip_ding_id: '6500907085284961754', // seems to always be the same as the id
}
```

Turning lights on and off
----------------

```js
async function messWithMyLights() {

   const devices = await ringApi.devices();

   // lights on and off
   // -----------------

   console.log( 'turning first cam light on' );

   await devices.stickup_cams[0].lightOn();

   console.log( 'light on now, let\'s turn it off again' );

   await devices.stickup_cams[0].lightOff();

   console.log( 'ok, it\'s off' );
};
```

Getting device history and videos
-----------

```js
async function logMyRingHistory() {

   const history = await ringApi.history();
   const videoUrl = await history[0].recording();

   console.log( 'latest video is at', videoUrl );
};
```

getting device health
---------------------

```js
function async printHealth( device ) {
   const strength = (await device.health()).latest_signal_strength;
   console.log( `${device.description} wifi strength is ${strength}` );
}

// asynchronously print the health of the first of each kind of device,
// without worrying about the order they are printed in:
const devices = await ringApi.devices();
printHealth( devices.doorbots[0] );
printHealth( devices.chimes[0] );
printHealth( devices.stick_up_cams[0] );
```

Thanks to
-----

* The [doorbot](https://github.com/davglass/doorbot) source for getting me started
* [This python API](https://github.com/tchellomello/python-ring-doorbell)
* [mitm proxy](https://mitmproxy.org)


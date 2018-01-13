
Ring API
===

An unofficial, friendly Node.js API for [ring](http://ring.com) doorbells, cameras, etc

Promised-based and aims to gloss over as much of ring's API weirdness as possible and hide the polling behind
events

usage
---

```js
const RingApi = require( 'ring-api' );
const ringApi =  RingApi( {

    // note - that the email and password can also be given by setting the RING_USER 
    // and RING_PASSWORD environment variables. This is better if you want to keep
    // passwords out of your source code
    email: 'you@example.com',
    password: 'password you use on ring.com',

    // OPTIONAL: any user agent you want to use default is the github
    // url of this project: 'http://github.com/jimhigson/ring-api'
    // note that this wont be used if running in a browser because this header
    // is considered unsafe
    userAgent: 'any string',

    // OPTIONAL: if true, will poll behind the scenes. Listening for
    // events only works if this is on. True by default.
    poll: true,
    
    // OPTIONAL
    // Set this if you need to run in a browser behind a proxy, for example
    // to get around x-origin request restrictions. Ring don't have CORS headers.
    // once set, all requests will be made relative to this value
    // default is 'https://api.ring.com/clients_api'
    // If running in node, you almost certainly want to leave this out
    serverRoot: 'http://example.com'
} );
```

Listening for activity on your ring devices
---

```js
const logActivity = activity => console.log( 'there is a activity', activity );

ringApi.events.on('activity', logActivity);
```

The event will be fired on rings and motion detected. To distinguish between then, use the activity.kind
property.

Where the activity object looks like:

```js
{
   // note - id will be a string - Javascript Number can't do large integers
   id: '6500907085284961754',
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

Getting a list of devices
------------

```js
// returns a promise
ringApi.devices();
```

Where the promise will resolve to an object like:

```js
{
   doorbells: [ /* array of doorbells */ ]
   authorizedDoorbells: [], // not certain what this is for - please email if you know
   chimes: [ /* array of chimes */ ],
   cameras: [ /* array of cameras, floodlight cams, spotlight cams etc */ ] ],
   baseStations: [] // presumably if you have a chime pro with the wifi hotspot built in?
}
```

Turning lights on and off
----------------

```js
const prompt = require('node-ask').prompt;

async function lightsOnAndOff() {

   const devices = await ringApi.devices();

   console.log( `turning on all lights` );

   // note that .lightOn() returns a promise
   // with the magic of promises we can turn them all on asynchronously
   await Promise.all( devices.cameras.map( c => c.lightOn() ) );

   await prompt( 'all your lights are now on, hit return to turn them off' ); 

   await Promise.all( devices.cameras.map( c => c.lightOff() ) );

   console.log( 'they\'re all off again!');
};

lightsOnAndOff();
```

Getting device history and videos
-----------

```js
async function logMyRingHistory() {

   const history = await ringApi.history();
   const firstVideoUrl = await history[0].videoUrl();

   console.log( 'latest video is at', firstVideoUrl );
   
   const allRecentVideos = Promise.all( history.map( h => h.videoUrl() ) );
   
   console.log( 'list of all recent videos:', await allRecentVideos );   
};
```

starting a livestream
--------------------

So far this only works so far as getting the SIP details of the stream. To get this, can do:
```js
// returns a promise that will resolve to the livestream SIP information:
devices.doorbells[0].liveStream();
```


getting device health
---------------------

```js
async function printHealth( device ) {
   const strength = (await device.health()).latest_signal_strength;
   console.log( `${device.description} wifi strength is ${strength}` );
}

// asynchronously print the health of the first of each kind of device,
// without worrying about the order they are printed in:
const devices = await ringApi.devices();
printHealth( devices.doorbells[0] );
printHealth( devices.chimes[0] );
printHealth( devices.cameras[0] );
```

Thanks to
-----

* The [doorbot](https://github.com/davglass/doorbot) source for getting me started
* [This python API](https://github.com/tchellomello/python-ring-doorbell)
* [mitm proxy](https://mitmproxy.org)


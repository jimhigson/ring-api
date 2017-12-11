
Promise-based wrapper around [doorbot](https://github.com/davglass/doorbot)
===

Unofficial wrapper around [davglass](https://github.com/davglass)'s unofficial API for Ring doorbells and cameras.

Also adds support for a few additional API endpoints and adds convenience methods to the response JSON.

usage
---

```js
// pass any options that doorbot accepts:
const ring = require( 'doorbot-promisified' ) ( {
    email: 'you@example.com',
    password: 'password you use on ring.com'
} );

async function useMyRing() {

   const devices = await ring.devices();

   // lights on and off
   // -----------------

   console.log( 'turning first cam light on' );

   await devices.stickup_cams[0].lightOn();

   console.log( 'light on now, let\'s turn it off again' );

   await devices.stickup_cams[0].lightOff();

   console.log( 'ok, it\'s off' );


   // history and recordings
   // ----------------------

   const history = await ring.history();
   const videoUrl = await history[0].recording();

   console.log( 'latest video is at', videoUrl );


   // getting device health
   // ---------------------

   function async printHealth( device ) {
      const strength = (await device.health()).latest_signal_strength;
      console.log( `${device.description} wifi strength is ${strength}` );
   }

   // asynchronously print the health of the first of each kind of device,
   // without worrying about the order they are printed in:
   printHealth( devices.doorbots[0] );
   printHealth( devices.chimes[0] );
   printHealth( devices.stick_up_cams[0] );
};

useMyRing();
```

api
---

`devices`, `history`, `recording`, `dings`, `lightOn`, `lightOff`, `lightToggle`, `simpleRequest` from doorbot
are all exposed, but all wrapped to return promises.

In addition, lights can be turned on and off using the lightOn, lightOff, lightToggle method
on the camera object. Ie:

```js
const devices = await ring.devices();
await devices.stickup_cams[0].lightOff();
```

and recordings of history items can be done in the same way:

```js
const history = await ring.history();
const recordingUrl = await history[0].recording();
```

and device health:
```js
const devices = await ring.devices();
await devices.stickup_cams[0].health();
```
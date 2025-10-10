# Sockhop

<p align="center">
  <img src="https://raw.githubusercontent.com/DaxBot/sockhop/master/assets/sockhop_365px.png">
  <p align="center">Node.js IPC</p>
</p>

- Object centric - put a string, object, Widget, whatever into one end and it comes out the other
- Buffers allowed - pick your level of optimization -> send full objects or raw buffers
- Uses TCP sockets or Unix domain sockets transparent to you
- Easy wrappers over the tricky parts of net.socket
- Auto reconnect
- Ping with auto disconnect/reconnect
- Remote callbacks across socket (basically promises over the wire)
- Manages binary buffers across the wire, reconstructs fragments back into objects/buffers

## Example
Here's some basic examples, but check out the [full documentation here](API.md)

### Basic example:
```javascript
const Sockhop=require("sockhop");

// Create server/client pair
let s=new Sockhop.Server();    // You can specify a socket location, IP address, etc. or it will pick defaults
let c=new Sockhop.Client();

// Something to pass 
class Widget {  /* ... */  }

// Pass a Widget
s.listen()
.then(()=>c.start()) // Version 1.x used: c.connect(), which is no longer preferred: see API for details
.then(()=>{

  // Send everyone a Widget 
  s.sendall(new Widget()); // Can put anything here, including a raw buffer!

});

c.on("receive", (obj, metadata)=>{

  // obj is serialized Widget
  // metadata.type=="Widget"

});  

```
### Special Case: Sending a buffer
Buffers do not, by default, nicely pack into JSON, so Sockhop has special handling for them. If you wish to send a literal, raw buffer, you can do so by passing them
to the `.send()` method, and they will be emitted on the other side as a `receive` event with `metadata.type=="Buffer"`. Currently, Sockup does not support Buffers
as part of a larger object. Note, that if the connection is not yet in binary mode (e.g. before a handshake is complete), the buffer will be base64 encoded to get it across the wire,
but after binary mode is established, it will be sent as raw binary data (i.e. no overhead).
```javascript
const buf = Buffer.from("Hello, World!");

s.on("receive", (obj, meta) => {
  if ( meta.type === "Buffer" ) {
    console.log("Got a buffer:", obj.toString()); // obj is a Buffer
  }
});

c.send(buf); // Send a raw buffer

```

WARNING: Sending raw buffers is only semi-supported interoperating with 1.x remotes. 1.x does not support binary mode, so buffers will always be base64 encoded, but more
importantly, 1.x remotes do not support the encoding/decoding of the base64 strings for you. As a result, if you are committed to using a 1.x remote, but want to send raw buffers,
you will need to do the base64 encoding/decoding yourself:
```javascript
// On the 1.x remote
c.on("receive", (obj, meta) => {
  if ( meta.type === "Buffer" ) {
    // obj is a base64 string
    const buf = Buffer.from(obj, 'base64'); // Decode the base64 string into a Buffer
    console.log("Got a buffer:", buf.toString());
  }
});
```
However, at the point where you are editing the 1.x remote code, you might as well upgrade to 2.x and run in compatibility mode, which gives you RX/TX Buffers, but retain the 1.x behavior otherwise.

### Sending Typed Buffers
Sending a raw buffer is great, but you usually want to know what kind of buffer it is so that you can easily send mutliple different types of buffers.
Sockhop supports sending typed buffers, but only in binary mode (i.e. after a handshake is complete).
To send a typed buffer, use the `.send_typed_buffer(type, buffer)` method. The `type` can be any string you want (less than 256 characters), and will be passed to the
receiver in `metadata.type` as part of the `receive:buffer` event. The `buffer` is a Node.js Buffer object (less than 4GB).

This workflow is helpful particularly if you want to implement your own custom serialization for a type. For example:
```javascript
// Set up a manual serialization for a custom type:
class MyUint32 {
    constructor(value) {
        this.value = value;
    }

    static from_buffer(buffer) {
        if ( buffer.length !== 4 ) throw new Error("Buffer length must be 4 bytes");
        const value = buffer.readUInt32BE(0);
        return new MyUint32(value);
    }

    to_buffer() {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(this.value);
        return buffer;
    }
}

// Must succeed the handshake:
await c.start(); // NOTE : `.connect()` will NOT work here, since it does not wait for the handshake to complete

// Must be in binary mode to send typed buffers, this will be true after `start()` unless you configured the client/server to not allow binary mode
if ( !c.binary_mode.tx ) throw new Error("Client is not in binary mode");

// Setup to receive typed buffers
s.on("receive:buffer", (buffer, meta) => {    // <- NOTE this is *not* the same as "receive" event
  if ( meta.type === "MyUint32" ) {
    const my_int32 = MyUint32.from_buffer(obj);
    console.log("Got a MyUint32:", my_int32.value);
  }
});

// Send a typed buffer
const my_value = new MyUint32(42);
c.send_typed_buffer("MyUint32", my_value.to_buffer());

```

### Remote callback example:
Sockhop also supports a request/reply pattern using callbacks. Just pass a function as the second argument to `.send()`, and it will be called on the remote side
with the reply:
```javascript
// Set up the handler
Server.on("receive", (obj, meta)=>{
  // obj=="Promise to call when you get this"
  meta.callback("I got your message!");
});

// Send the message, with a callback to catch the reply
c.send("Promise to call when you get this", (reply)=>{
  // reply == "I got your message!"
});
```

### Session example:
The client since allows for nice customization, since you control the client instantiation, however, you can also customize the Server side
by extending the SockhopSession class. This is useful for things like authentication, etc.
```javascript
const Sockhop=require("sockhop");

/**
 * Class to save verification information about a
 * socket
 */
class Session extends Sockhop.Session {
  constructor(socket, server) {
    super();
    this.socket = socket; // Save a reference to the socket
    this.verified = false;
  }
  async start() {
    // Require sockets to verify themselves with in 3 seconds
    this.to = setTimeout(() => this.socket.end(), 3000);
  }
  verify() {
    this.verified = true;
    clearTimeout(this.to);
  }
}

// Create server/client pair
let s=new Sockhop.Server({session_type : Session});
let c=new Sockhop.Client();

s.on('receive', (data, meta) => {
  // Require verification to continue
  if ( !meta.session.verified && meta.type !== 'Verify' ) return;

  switch ( meta.type ) {
  case "Verify":
    // run verification code here
    meta.sesison.verify();
  case "Other":
    // run everything else here
  }
});

s.listen()
.then(()=>c.start()) // Version 1.x used: c.connect(), which is no longer preferred: see API for details
.then(()=>{
  c.send("some verification object");
});
```

### Handshake example:
For the 2.x libarary version, it is strongly recommended that you use handshake-based connections and events for managing lifecycle:
```js
const client = new Sockhop.Client({ auto_rehandshake: true });
await client.start(); // Waits for handshake to complete

client.binary_mode.tx; // has a definite value, now that the handshake is complete

client.on("handshake", (success, error) => {
   // Can catch errors where, or handle re-connections
});

client.on("unhandshake", () => {
  // Handle when a handshaked-connection is lost
});

await client.disconnect();
```

### Interoperating with 1.x/compatibility mode remotes:
That being said, if you are trying to interoperate with a 1.x/compatibility mode remote, many of the above methods/events
will mis-behave, since the handshake doesn't success with a 1.x/compatibility mode remote. In that case, you will need to
handle both cases:

```js
const client = new Sockhop.Client({ auto_reconnect: true });

client.on("receive", (obj, meta) => {
  // Attach handlers *before* calling connect, since 1.x/compatibility mode remotes can start sending data immediately after the connect event

  // If you want to differentiate, you can switch on client.handshake_successful or client.binary_mode.rx == true
  if ( client.handshake_successful ) {
     // 2.x+ client
  } else {
     // 1.x/compatibility mode client
  }
});

// await client.start(); // This will throw an error if the remote is 1.x/compatibility mode
await client.connect(); // Does not wait for handshake to complete

client.on("handshake", (success, error) => {
  // Use this for reconnctions, and to differentiate between 2.x+ and 1.x/compatibility mode remotes:
  // Check for error.code=="ERR_HANDSHAKE_TIMEOUT"

  if ( success ) {
    // 2.x+ client
  } else if (error.code=="ERR_HANDSHAKE_TIMEOUT") {
    // 1.x/compatibility mode remote
  } else {
    // Handle error
  }
});


// client.on("unhandshake", () => {}); // Only fires for 2.x+ handshaked-connection lost:
client.on("disconnect", (sock, handshaked) => {
  if ( handshaked ) {
    // 2.x+ handshaked-connection lost, same as unhandshake event
  } else {
    // Handle 1.x/compatibility or 2.x+failed handshake disconnects
  }
});

await client.disconnect(); // Disconnects cleanly
```
 
If you would rather skip the complexity, and just have this library behave like 1.x, you can enable compatibility mode,
though, this will totally disable all handshake-related features.
```js
const client = new Sockhop.Client({ compatibility_mode: true, auto_reconnect: true });

await client.connect(); // Does not even attempt a handshake, nor waits for one

client.binary_mode.tx; // will always be false, since we are not doing a handshake

// client.on("handshake", (success, error) => {}); // this will never fire
client.on("connect", () => {
  // but this will!
});

// client.on("unhandshake", () => {}); // Also will never fire
client.on("disconnect", (sock, handshaked) => {
  handshaked; // will always be false
});

await client.disconnect(); // Disconnects cleanly
```

## Notes
Sockhop easily passes objects across the wire.  If you pack/transcode JS in a way that mutates class names, this functionality will be broken!  This includes auto ping functionality.

If you ```server.listen()```, make sure you ```server.close()``` when you are done so Node won't hang forever on program exit.  Similarly, if you turn on ```client.ping()``` or set ```client({auto_reconnect:true})```, make sure you finish up by ```client.ping(0)``` (to disable pings) and ```client.disconnect()``` (note this will also stop pinging).


## Migrating from 1.x to 2.x
Sockhop 2.x is mostly backwards compatible with 1.x, but there are a few changes:
- The `Sockhop` object has had its keys captialized: e.g. `Sockhop.client` is now `Sockhop.Client`, `Sockhop.server` is now `Sockhop.Server`, etc.
- The `client.start()` method has been added, which is now the preferred way to connect a client, as it waits for the handshake to succeed.
    - `client.start()` will attempt to connect once (throwing if the handshake fails). Then if `auto_rehandshake` is set to true, it will start the reconnect loop.
- The `auto_reconnect` setter has been removed.
    - Instead, set `auto_reconnect` in the options object when creating the client: `new Sockhop.client({auto_reconnect:true})` and then call `client.start()/client.connect()`.
    - Note: the `client.start()/client.connect()` methods will only start the reconnect loop if the initial call succeds,
        so you will probably want to wrap it in a loop with a try/catch if you want to keep trying until it connects. See the API docs for details.
- The `client.connect()` method is still available, but it is no longer the preferred way to connect a client.
    - Instead, use `client.start()`
    - The exception here is if you need to interopterate with a 1.x/compatibility_mode server, in which case you should use `client.connect()` and listen for
      the `handshake` event to know when the connection is ready - see the API docs for details.


## Linting, building docs, and testing
```sh
npm run lint:fix
npm run build
npm run test
```

## License
MIT

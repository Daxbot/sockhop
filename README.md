# Sockhop

<p align="center">
  <img src="https://raw.githubusercontent.com/DaxBot/sockhop/master/assets/sockhop_365px.png">
  <p align="center">Node.js IPC</p>
</p>

- Object centric - put a string, object, Widget, whatever into one end and it comes out the other
- Pass objects directly between different node programs
- Uses TCP sockets or Unix domain sockets transparent to you
- Easy wrappers over the tricky parts of net.socket
- Auto reconnect  
- Ping with auto disconnect/reconnect
- Remote callbacks across socket
- Manages binary buffers across the wire, reconstructs fragmented JSON buffers (see lib/JSONObjectBuffer.js)
- Server options for talking to (non Sockhop) other clients

## Example
Here's some basic examples, but check out the [full documentation here](API.md)

```javascript
const Sockhop=require("sockhop");

// Create server/client pair
let s=new Sockhop.server();    // You can specify a socket location, IP address, etc. or it will pick defaults
let c=new Sockhop.client();

// Something to pass 
class Widget {  /* ... */  }

// Pass a Widget
s.listen()
.then(()=>c.start()) // Version 1.x used: c.connect(), which is no longer preferred: see API for details
.then(()=>{

  // Send everyone a Widget 
  s.sendall(new Widget()); // Can put anything here

});

c.on("receive", (obj, metadata)=>{

  // obj is serialized Widget
  // metadata.type=="Widget"

});  

```


Remote callback example:
```javascript
server.on("receive", (obj, meta)=>{

  // obj=="Promise to call when you get this"
  meta.callback("I got your message!");
});

c.send("Promise to call when you get this", (reply)=>{

  // reply == "I got your message!"
});
```

Session example
```javascript
const Sockhop=require("sockhop");

/**
 * Class to save verification information about a
 * socket
 */
class Session extends Sockhop.session {
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
let s=new Sockhop.server({session_type : Session});
let c=new Sockhop.client();

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

For the 2.x libarary version, it is strongly recommended that you use handshake-based connections and events for managing lifecycle:
```js
const client = new SockhopClient({ auto_rehandshake: true });
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

That being said, if you are trying to interoperate with a 1.x/compatibility mode remote, many of the above methods/events
will mis-behave, since the handshake doesn't success with a 1.x/compatibility mode remote. In that case, you will need to
handle both cases:

```js
const client = new SockhopClient({ auto_reconnect: true });

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
 const client = new SockhopClient({ compatibility_mode: true, auto_reconnect: true });

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
- The `auto_reconnect` setter has been removed.
    - Instead, set `auto_reconnect` in the options object when creating the client: `new Sockhop.client({auto_reconnect:true})` and then call `client.start()/client.connect()`.
    - Note: the `client.start()/client.connect()` methods will only start the reconnect loop if the initial call succeds,
        so you will probably want to wrap it in a loop with a try/catch if you want to keep trying until it connects. See the API docs for details.
- The `client.connect()` method is still available, but it is no longer the preferred way to connect a client.
    - Instead, use `client.start()`, which will attempt to connect once and then start the reconnect loop if `auto_reconnect` is set to true.
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

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
- Promise-based request/responses bi-directionally between server and clients
- Remote callbacks across socket
- Manages binary buffers across the wire, reconstructs fragmented JSON buffers (see lib/ObjectBuffer.js)
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
.then(()=>c.connect())
.then(()=>{

  // Send everyone a Widget 
  s.sendall(new Widget()); // Can put anything here

});

c.on("receive", (obj, metadata)=>{

  // obj is serialized Widget
  // metadata.type=="Widget"

});  

```

Promise-based Request/Response example with client-initiated request
```javascript
s.on("request", (request, response, meta)=>{

  // request.type=="String"
  // request.data=="Can I have some data?"
  response.send("Sure!");
});

c.request("Can I have some data?")
  .then(stream => stream.next())
  .then((response)=>{
    // response.type == "String"
    // response.data == "Sure!"
  });
```

Promise-based Request/Response example with server-initiated request
```javascript
c.on("request", (request, response)=>{
  // request.type=="String"
  // request.data=="Now I want data"
  response.send("You can have it too");
});

s.once("connect", (sock, sess) => {
  // OR : sess.request("Now I want data")
  s.request(sock, "Now I want data")
    .then(stream => stream.next())
    .then((response)=>{

    // response.type == "String"
    // response.data == "You can have it too"
  });
});

// Trigger connect event on server to get session reference
c.disconnect().then(() => c.connect());
```

Promise-based Request/Response example with client-initiated request, and streamed data
```javascript
s.on("request", (request, response, meta)=>{

  // request.type=="String"
  // request.data=="Can I have some data?"
  response.write("Sure!");
  response.write("Sure again!");
  response.end(); // Don't forget me, or the client will timeout!
});

c.request("Can I have some data?")
  .then(stream => {
    stream.on("data", (data, type) => { /* data will show up here */ });
    stream.on("end", () => { /* the stream is over */ });
  })
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
.then(()=>c.connect())
.then(()=>{
  c.send("some verification object");
});
```



## Linting, building docs, and testing
```sh
npm run lint:fix
npm run build
npm run test
```

## Notes
Sockhop easily passes objects across the wire.  If you pack/transcode JS in a way that mutates class names, this functionality will be broken!  This includes auto ping functionality.

If you ```server.listen()```, make sure you ```server.close()``` when you are done so Node won't hang forever on program exit.  Similarly, if you turn on ```client.ping()``` or set ```client.auto_reconnect=true```, make sure you finish up by ```client.ping(0)``` (to disable pings) and ```client.auto_reconnect=false```.  Alternately you can ```client.disconnect()``` and it will turn off pings/auto_reconnect for you.

## License
MIT

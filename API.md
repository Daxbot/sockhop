## Classes

<dl>
<dt><a href="#JSONObjectBuffer">JSONObjectBuffer</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Object Buffer for JSON encoding</p>
<p>de/serialize objects to/from a Buffer</p>
<p>Automatically reassembles fragmented buffers (useful when the buffer passes through
a socket, for example, and is received in pieces) and gives you your object back</p>
</dd>
<dt><a href="#ObjectBuffer">ObjectBuffer</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Object Buffer for  encoding</p>
<p>de/serialize objects to/from a Buffer</p>
<p>Automatically reassembles fragmented buffers (useful when the buffer passes through
a socket, for example, and is received in pieces) and gives you your object back</p>
</dd>
<dt><a href="#SockhopClient">SockhopClient</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Wrapped TCP client</p>
</dd>
<dt><a href="#SockhopError">SockhopError</a> ⇐ <code>Error</code></dt>
<dd><p>Custom sockhop errors</p>
<p>Error types, should only change with major versions</p>
<ul>
<li>ERR_MULTICONNECT : attempting to call connect while a socket is already connecting</li>
<li>ERR_SOCKET_DESTROYED : attempting to interact with a destroyed socket</li>
<li>ERR_REMOTE_CALLBACK_TYPE : attempting to use remote callbacks with wrong message types, or not a callback function</li>
<li>ERR_REQUEST_TYPE : attempting to use requests with wrong message types</li>
<li>ERR_NO_SOCKET : attempting to send a message with no socket</li>
<li>ERR_BAD_DATA : attempting to send a message with no data payload</li>
<li>ERR_OBJECTBUFFER_BAD_BUFFER : attempting to do a buffer operation with a non-buffer</li>
<li>ERR_OBJECTBUFFER_BAD_BUFFER_DATA : attempting to do a buffer operation with bad data in the buffer</li>
<li>ERR_OBJECTBUFFER_BAD_OBJECT : attempting to do an object operation with a non-serializable object</li>
<li>ERR_RESPONSE_TIMEOUT : the response timed out</li>
<li>ERR_RESPONSE_SEND : the response could not be sent</li>
</ul>
</dd>
<dt><a href="#SockhopPing">SockhopPing</a></dt>
<dd><p>TCP Ping</p>
<p>Used internally when .ping() is called</p>
</dd>
<dt><a href="#SockhopPong">SockhopPong</a></dt>
<dd><p>TCP Ping reply</p>
<p>Used internally when .ping() is replied</p>
</dd>
<dt><a href="#SockhopServer">SockhopServer</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Wrapped TCP server</p>
<p>When data is received by the server, the received Buffer is concatenated with previously
received Buffers until a delimiter (usually &quot;\n&quot;) is received.  The composite Buffer is then treated
like a JSON string and converted to an object, which is triggers a &quot;receive&quot; event.
If the client is a SockhopClient, it will further wrap sent data in metadata that describes the type -
this allows you to pass custom objects (prototypes) across the wire, and the other end will know
it has received your Widget, or Foo, or whatever.  Plain objects, strings, etc. are also similarly labelled.
The resulting receive event has a &quot;meta&quot; parameter; meta.type will list the object type.</p>
<p>Of course, if your client is not a SockhopClient, you don&#39;t want this wrapping/unwrapping behavior
and you might want a different delimiter for JSON.  Both these parameters are configurable in the
constructor options.</p>
</dd>
<dt><a href="#SockhopSession">SockhopSession</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Base class wrapper for server-side sockets</p>
<p>When a new connection is received by the server, the server will wrap
that socket with an instance of this (or child of this) class -- configurable
with the <code>session_type</code> option in the server&#39;s constructor. This class
allows for arbitrary user-data to be assigned to the clients (for example,
authentication state information) without having to abuse the underlying
net.Socket object.</p>
<p>This class does almost nothing, apart from holding internal references to
the net.Socket and SockhopServer instances, and is really intended to be
extended. As such, there are several &#39;virtual&#39; methods included here,
which users are encouraged to implement for their specific application.</p>
<p>Sessions are the preferred way for users to interact with client connections,
in that users should write child classes which inhert from this base class to
interact with the net.Socket instance, and then have their applications call
the session methods, rather than calling socket methods directly. For instance,
users are discouraged from directly calling <code>socket.end()</code> to terminate
clients connection from the server. Rather, users should call <code>session.kill()</code>.</p>
</dd>
</dl>

<a name="JSONObjectBuffer"></a>

## JSONObjectBuffer ⇐ <code>EventEmitter</code>
Object Buffer for JSON encoding

de/serialize objects to/from a Buffer

Automatically reassembles fragmented buffers (useful when the buffer passes through
a socket, for example, and is received in pieces) and gives you your object back

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [JSONObjectBuffer](#JSONObjectBuffer) ⇐ <code>EventEmitter</code>
    * [new JSONObjectBuffer(opts)](#new_JSONObjectBuffer_new)
    * [.buf2obj(buffer)](#JSONObjectBuffer+buf2obj) ⇒ <code>Array</code>
    * [.obj2buf(object, buffer)](#JSONObjectBuffer+obj2buf)

<a name="new_JSONObjectBuffer_new"></a>

### new JSONObjectBuffer(opts)
Constructs a new JSONObjectBuffer


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>object</code> |  | the options |
| [opts.terminator] | <code>string</code> \| <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the terminator to signal the end of a JSON object. If an array is given, the first element is a receive (buf2obj) terminator and the second is the transmit (obj2buf) element |
| [opts.allow_non_objects] | <code>boolean</code> | <code>false</code> | allow non objects in buf2obj (will be passed through as Strings) |

<a name="JSONObjectBuffer+buf2obj"></a>

### jsonObjectBuffer.buf2obj(buffer) ⇒ <code>Array</code>
buf2obj

Convert a Buffer into one or more objects

**Kind**: instance method of [<code>JSONObjectBuffer</code>](#JSONObjectBuffer)  
**Returns**: <code>Array</code> - found the objects we found  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | the buffer to read (we may modify or store it!) |

<a name="JSONObjectBuffer+obj2buf"></a>

### jsonObjectBuffer.obj2buf(object, buffer)
obj2buf

Convert an Object to a Buffer

**Kind**: instance method of [<code>JSONObjectBuffer</code>](#JSONObjectBuffer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object</code> | the object to convert |
| buffer | <code>Buffer</code> | the buffer representing that object |

<a name="ObjectBuffer"></a>

## ObjectBuffer ⇐ <code>EventEmitter</code>
Object Buffer for  encoding

de/serialize objects to/from a Buffer

Automatically reassembles fragmented buffers (useful when the buffer passes through
a socket, for example, and is received in pieces) and gives you your object back

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [ObjectBuffer](#ObjectBuffer) ⇐ <code>EventEmitter</code>
    * [new ObjectBuffer(opts)](#new_ObjectBuffer_new)
    * [.buf2obj(buffer)](#ObjectBuffer+buf2obj) ⇒ <code>Array</code>
    * [.obj2buf(name, object, buffer)](#ObjectBuffer+obj2buf)

<a name="new_ObjectBuffer_new"></a>

### new ObjectBuffer(opts)
Constructs a new ObjectBuffer


| Param | Type | Description |
| --- | --- | --- |
| opts | <code>object</code> | the options |

<a name="ObjectBuffer+buf2obj"></a>

### objectBuffer.buf2obj(buffer) ⇒ <code>Array</code>
buf2obj

Convert a Buffer into one or more objects

**Kind**: instance method of [<code>ObjectBuffer</code>](#ObjectBuffer)  
**Returns**: <code>Array</code> - found the objects we found  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | the buffer to read (we may modify or store it!) |

<a name="ObjectBuffer+obj2buf"></a>

### objectBuffer.obj2buf(name, object, buffer)
obj2buf

Convert an Object to a Buffer

**Kind**: instance method of [<code>ObjectBuffer</code>](#ObjectBuffer)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | the name of the schema to use |
| object | <code>Object</code> | the object to convert |
| buffer | <code>Buffer</code> | the buffer representing that object |

<a name="SockhopClient"></a>

## SockhopClient ⇐ <code>EventEmitter</code>
Wrapped TCP client

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  
**Emits**: [<code>connect</code>](#SockhopClient+event_connect), [<code>disconnect</code>](#SockhopClient+event_disconnect), [<code>handshake</code>](#SockhopClient+event_handshake), [<code>unhandshake</code>](#SockhopClient+event_unhandshake), [<code>debug:sending</code>](#SockhopClient+debug_sending), [<code>debug:sending:buffer</code>](#SockhopClient+debug_sending_buffer), [<code>debug:received</code>](#SockhopClient+debug_received), [<code>debug:received:buffer</code>](#SockhopClient+debug_received_buffer), [<code>binary\_mode:rx</code>](#SockhopClient+event_binary_mode_rx), [<code>binary\_mode:tx</code>](#SockhopClient+event_binary_mode_tx), <code>SockhopClient#event:error</code>, [<code>receive</code>](#SockhopClient+event_receive), [<code>receive:buffer</code>](#SockhopClient+receive_buffer), <code>event:SockhopError</code>  

* [SockhopClient](#SockhopClient) ⇐ <code>EventEmitter</code>
    * [new SockhopClient([opts])](#new_SockhopClient_new)
    * [.connected](#SockhopClient+connected) ⇒ <code>boolean</code>
    * [.auto_reconnect](#SockhopClient+auto_reconnect) ⇒ <code>boolean</code>
    * [.auto_rehandshake](#SockhopClient+auto_rehandshake) ⇒ <code>boolean</code>
    * [.auto_reconnect](#SockhopClient+auto_reconnect)
    * [.debug](#SockhopClient+debug) ⇒ <code>boolean</code>
    * [.compatibility_mode](#SockhopClient+compatibility_mode) ⇒ <code>boolean</code>
    * [.handshake_successful](#SockhopClient+handshake_successful) ⇒ <code>boolean</code>
    * [.init_complete](#SockhopClient+init_complete) ⇒ <code>boolean</code>
    * [.binary_mode](#SockhopClient+binary_mode) ⇒ <code>object</code> \| <code>boolean</code> \| <code>boolean</code>
    * [.socket](#SockhopClient+socket) : <code>net.socket</code>
    * [._perform_auto_reconnect()](#SockhopClient+_perform_auto_reconnect)
    * [._perform_auto_rehandshake()](#SockhopClient+_perform_auto_rehandshake)
    * [.start()](#SockhopClient+start) ⇒ <code>Promise</code>
    * [.connect()](#SockhopClient+connect) ⇒ <code>Promise</code>
    * [.get_bound_address()](#SockhopClient+get_bound_address) ⇒ <code>string</code>
    * [.send(object, [rcallback])](#SockhopClient+send) ⇒ <code>Promise</code>
    * [.send_typed_buffer(type, buff, [callback])](#SockhopClient+send_typed_buffer) ⇒ <code>Promise</code>
    * [.ping(delay)](#SockhopClient+ping)
    * [.disconnect()](#SockhopClient+disconnect) ⇒ <code>Promise</code>
    * ["connect" (sock)](#SockhopClient+event_connect)
    * ["handshake" (success, error)](#SockhopClient+event_handshake)
    * ["unhandshake"](#SockhopClient+event_unhandshake)
    * ["receive" (object, meta)](#SockhopClient+event_receive)
    * ["receive:buffer" (buffer, meta)](#SockhopClient+receive_buffer)
    * ["disconnect" (sock, handshaked)](#SockhopClient+event_disconnect)
    * ["debug:sending" (object, buffer, binary_mode)](#SockhopClient+debug_sending)
    * ["debug:received" (object, buffer, binary_mode)](#SockhopClient+debug_received)
    * ["debug:sending:buffer" (object, buffer, binary_mode)](#SockhopClient+debug_sending_buffer)
    * ["debug:received:buffer" (object, buffer, binary_mode)](#SockhopClient+debug_received_buffer)
    * ["binary_mode:rx" (enabled)](#SockhopClient+event_binary_mode_rx)
    * ["binary_mode:tx" (enabled)](#SockhopClient+event_binary_mode_tx)

<a name="new_SockhopClient_new"></a>

### new SockhopClient([opts])
Constructs a new SockhopClient


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

**Throws**:

- [<code>SockhopError</code>](#SockhopError) 


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [opts] | <code>object</code> |  | an object containing configuration options |
| [opts.path] | <code>string</code> |  | the path for a Unix domain socket.  If used, this will override the address and port values. |
| [opts.address] | <code>string</code> | <code>&quot;\&quot;127.0.0.1\&quot;&quot;</code> | the IP address to bind to |
| [opts.port] | <code>number</code> | <code>50000</code> | the TCP port to use |
| [opts.ssl] | <code>boolean</code> | <code>false</code> | use tls |
| [opts.ssl_options] | <code>object</code> | <code>{}</code> | options to pass to the tls socket constructor, see `tls.connect` for details, note, if any options are provided, the `opts.ssl` flag is overriden as true |
| [opts.auto_rehandshake] | <code>number</code> | <code>false</code> | automatically try to rehandshake if the connection is lost (overrides auto_reconnect if both are set) |
| [opts.auto_reconnect] | <code>number</code> | <code>false</code> | automatically try to reconnect if the connection is lost |
| [opts.auto_reconnect_interval] | <code>number</code> | <code>2000</code> | the auto reconnection interval, in ms. |
| [opts.auto_rehandshake_interval] | <code>number</code> | <code>5000</code> | the auto reconnection interval, in ms. |
| [opts.auto_reconnect_requires_handshake] | <code>boolean</code> | <code>true</code> | have reconnections fail unless the handshake completes successfully |
| [opts.terminator] | <code>string</code> \| <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the JSON object delimiter.  Passed directly to the JSONObjectBuffer constructor. |
| [opts.allow_non_objects] | <code>boolean</code> | <code>false</code> | allow non objects to be received and transmitted. Passed directly to the JSONObjectBuffer constructor. |
| [opts.connect_timeout] | <code>number</code> | <code>5000</code> | the length of time in ms to try to connect before timing out |
| [opts.debug] | <code>boolean</code> | <code>false</code> | run in debug mode -- which adds additional emits |
| [opts.handshake_timeout] | <code>number</code> | <code>3000</code> | the length of time in ms to wait for a handshake response before timing out |
| [opts.compatibility_mode] | <code>boolean</code> | <code>false</code> | enable compatibility mode, which will disable handshakes for simulating 1.x behavior |
| [opts.allow_binary_mode] | <code>boolean</code> | <code>true</code> | request binary mode during handshake (ignored in compatibility mode) |
| [opts.allow_unsafe_encoding] | <code>boolean</code> | <code>false</code> | allow the binary_mode encodings to be 'unsafe' (i.e. not type checked), for faster preformance. Ingored if binary_mode is not enabled |

<a name="SockhopClient+connected"></a>

### sockhopClient.connected ⇒ <code>boolean</code>
connected

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - connected whether or not we are currently connected (e.g. can data be sent)  
<a name="SockhopClient+auto_reconnect"></a>

### sockhopClient.auto\_reconnect ⇒ <code>boolean</code>
auto_reconnect getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - auto_reconnect the current auto_reconnect setting  
<a name="SockhopClient+auto_rehandshake"></a>

### sockhopClient.auto\_rehandshake ⇒ <code>boolean</code>
auto_rehandshake getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - auto_reconnect the current auto_reconnect setting  
<a name="SockhopClient+auto_reconnect"></a>

### sockhopClient.auto\_reconnect
auto_reconnect setter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| auto_reconnect | <code>boolean</code> | the desired auto_reconnect setting |

<a name="SockhopClient+debug"></a>

### sockhopClient.debug ⇒ <code>boolean</code>
debug mode getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - debug whether or not we are in debug mode  
<a name="SockhopClient+compatibility_mode"></a>

### sockhopClient.compatibility\_mode ⇒ <code>boolean</code>
compatibility_mode getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - compatibility_mode whether or not we are in compatibility mode  
<a name="SockhopClient+handshake_successful"></a>

### sockhopClient.handshake\_successful ⇒ <code>boolean</code>
handshake_successful getter

NOTE : this will be false if the handshake has not yet completed, or if the client is in compatibility mode

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - handshake_successful whether or not the last handshake was successful  
<a name="SockhopClient+init_complete"></a>

### sockhopClient.init\_complete ⇒ <code>boolean</code>
init_complete getter

NOTE : this will be true if the client is in compatibility mode and connected, since no handshake is expected

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - init_complete is the client still expecting to run more initialization steps (e.g. handshake)  
<a name="SockhopClient+binary_mode"></a>

### sockhopClient.binary\_mode ⇒ <code>object</code> \| <code>boolean</code> \| <code>boolean</code>
binary_mode getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>object</code> - binary_mode the current binary mode status<code>boolean</code> - binary_mode.rx true if we are receiving in binary mode<code>boolean</code> - binary_mode.tx true if we are transmitting in binary mode  
<a name="SockhopClient+socket"></a>

### sockhopClient.socket : <code>net.socket</code>
Underlying net.socket

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+_perform_auto_reconnect"></a>

### sockhopClient.\_perform\_auto\_reconnect()
Perform an auto reconnet (internal)

We have determined that an auto reconnect is necessary.
We will initiate it, and manage the fallout.

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+_perform_auto_rehandshake"></a>

### sockhopClient.\_perform\_auto\_rehandshake()
Perform an auto rehandshake (internal)

We have determined that an auto rehandshake is necessary.
We will initiate it, and manage the fallout.

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+start"></a>

### sockhopClient.start() ⇒ <code>Promise</code>
Start a connection to the server (including handshake)

NOTE : this requires a "clean" start, meaning we are neither connected nor trying to connect.

This method will only resolve if the handshake completes successfully, otherwise it will reject (similar to how
connect() will throw if the connection fails). This also means that if the connection succeeds, but the handshake
fails or times out, this will reject, and the connection will be closed.

If you want to keep trying until you connect and handshake successfully, you will want to set auto_reconnect to true,
and then call this method in a loop with a try/catch block, since this method will throw if the connection or handshake fails.

If you are interoperating with a 1.x/compatibility mode remote, you should not use this method, since it will *always* throw,
instead you should use `.connect()` but add your own listener to the `handshake` event and check handle success/failure there.
See the `handshake` event docs for more information.

NOTE : if auto_reconnect is enabled, it will only start trying to reconnect once the handshake completes successfully.
       however, the reconnections *do not* guarentee that the handshake will succeed, so you should still listen for the 'handshake' event.
       Even better would be to set auto_rehandshake to true, which will try to rehandshake automatically if the connection is lost. However,
       that workflow doesn't play nicely with interoperating with 1.x/compatibility mode remotes, since the handshake will never succeed.

WARNING: if the other side of the connection get's a connect event, they can begin sending data immediately, so if there are issues
         with the handshake, you could end up in bad sitaution of the other side repeatedly sending data that you are ignoring.

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>Promise</code> - resolves once connected and handshake completes  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 

<a name="SockhopClient+connect"></a>

### sockhopClient.connect() ⇒ <code>Promise</code>
Connect

WARNING: this does not wait for the handshake to complete. Unless you are in compatibility mode or trying to interoperate
         with a 1.x remote, you should probably use `.start()` instead, which will wait for the handshake to complete.
         See notes below and on the `handshake` event for more information.

Attempt to connect to the server. If we are already connected, this returns immediately.
If we are already trying to connect, this throws an error.
If this client has been configured for auto_reconnect, it will start a reconnection timer only once connected.

if this client has been configured with auto_rehandshake, this method will throw an error, since you almost certainly want `.start()` instead.
If you are *very* certian you want to use `.connect()` with auto_rehandshake, you can call the internal `._connect()` method instead.

If you want to keep trying until you connect, you will want to set auto_reconnect to true, and then call this
method in a loop with a try/catch block, since this method will throw if the connection fails.

NOTE : this method does not wait for the handshake to complete.  You should listen for the 'handshake' event
       to determine if the handshake was successful, or use the `.resolve_on_handshake()` method to get a
       promise that resolves once the handshake completes.

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>Promise</code> - resolves once connected  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 

<a name="SockhopClient+get_bound_address"></a>

### sockhopClient.get\_bound\_address() ⇒ <code>string</code>
Get bound address

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>string</code> - the IP address we are bound to  
<a name="SockhopClient+send"></a>

### sockhopClient.send(object, [rcallback]) ⇒ <code>Promise</code>
Send

This will appear on the remote side as a receive event

Send an object to the server

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 


| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | to be sent over the wire |
| [rcallback] | <code>function</code> | Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise |

<a name="SockhopClient+send_typed_buffer"></a>

### sockhopClient.send\_typed\_buffer(type, buff, [callback]) ⇒ <code>Promise</code>
Send a buffer with a type descriptor

This will appaer on the remote side as a receive:buffer event

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 


| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | a type name for what the buffer encodes |
| buff | <code>Buffer</code> | the buffer to send |
| [callback] | <code>function</code> | Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise |

<a name="SockhopClient+ping"></a>

### sockhopClient.ping(delay)
Ping

Send ping, detect timeouts.  If we have 4 timeouts in a row, we kill the connection and emit a 'disconnect' event.
You can then call .connect() again to reconnect.

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| delay | <code>number</code> | <code>0</code> | in ms (0 disables ping) |

<a name="SockhopClient+disconnect"></a>

### sockhopClient.disconnect() ⇒ <code>Promise</code>
disconnect

Disconnect the socket (send FIN)
Pinging will also be turned off... if you want to keep pinging, you will need to call .ping() again after you connect again

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+event_connect"></a>

### "connect" (sock)
connect event

this fires when we have successfully connected to the server, but before the handshake completes/times-out.

NOTE : unless you are in compatibility mode or trying to interoperate with a 1.x remote, you should probably
       wait for the `handshake` event instead of `connect`. See discussion in the `handshake` event docs for more information

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |

<a name="SockhopClient+event_handshake"></a>

### "handshake" (success, error)
handshake event

This fires when the handshake completes or times out

WARNING: if the other side of the connection get's a connect event, they can begin sending data immediately.
         regardless of whether or not the handshake completes or times out, or is simply ignored (compatibility mode
         or 1.x library version). This means data can be sent before the handshake completes, unless both sides
         have agreed to wait for the handshake event before sending any data. It is recommnded that in situations
         where you cannot gaurantee that both sides are using Sockhop 2.x with handshakes, that you should listen
         for the connection event for the purpose of adding event handlers, but wait for the handshake event
         to proactively send any data, so that the send logic can depending on a know handshake state. This will
         have the added benefit of ensuring that you will not try to tx until the binary mode negotiation is complete,
         (which finish immediately before the handshake event fires). Finally, this will allow a smooth transition
         when all 1.x/compoatibility mode clients are upgraded to 2.x with handshakes, since in that case, both
         sides will already be waiting for the handshake event before sending any data.

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| success | <code>boolean</code> | true if the handshake was successful, false if it timed out or failed |
| error | <code>Error</code> | if the handshake failed, this will contain the error, otherwise undefined |

<a name="SockhopClient+event_unhandshake"></a>

### "unhandshake"
unhandshake event

This fires when we were previously handshaked, but the connection was lost. This is analogous
to the `disconnect` event, but only fires if we were previously handshaked. If you are interoperating
with a 1.x/compatibility mode remote, this event will not fire, since the handshake will never succeed.

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+event_receive"></a>

### "receive" (object, meta)
receive object event

We have successfully received an object from the server

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the received object |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received object constructor ("Object", "String", "Widget", etc) |
| meta.callback | <code>function</code> | if the received object was sent with a callback, this is the function to call to respond |

<a name="SockhopClient+receive_buffer"></a>

### "receive:buffer" (buffer, meta)
receive a typed buffer event

We have successfully received a buffer from the server

NOTE : this will only fire in binary mode (rx) and if the remote end specifically called send_typed_buffer().
      If instead the remote end called send() with a Buffer, you will get a normal 'receive' event with the
      type set to "Buffer".

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | the received buffer |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received buffer type ("String", "Widget", etc) |
| meta.callback | <code>function</code> | if the received object was sent with a callback, this is the function to call to respond |

<a name="SockhopClient+event_disconnect"></a>

### "disconnect" (sock, handshaked)
disconnect event

This fires when we have disconnected from the server, either because the server closed the connection,
or because we called disconnect().  If we were previously handshaked, the `unhandshake` event will
fire first, followed by this event.

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |
| handshaked | <code>boolean</code> | true if we were previously handshaked, false otherwise |

<a name="SockhopClient+debug_sending"></a>

### "debug:sending" (object, buffer, binary_mode)
sending event

NOTE : This event is only emitted if the SockhopClient is in debug mode

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we are sending |
| buffer | <code>Buffer</code> | the buffer we are sending |
| binary_mode | <code>boolean</code> | true if we are sending in binary mode |

<a name="SockhopClient+debug_received"></a>

### "debug:received" (object, buffer, binary_mode)
received event

NOTE : This event is only emitted if the SockhopClient is in debug mode

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we just received |
| buffer | <code>Buffer</code> | the buffer we just received |
| binary_mode | <code>boolean</code> | true if we are receiving in binary mode |

<a name="SockhopClient+debug_sending_buffer"></a>

### "debug:sending:buffer" (object, buffer, binary_mode)
sending typed buffer event

NOTE : This event is only emitted if the SockhopClient is in debug mode

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we are sending |
| object.data | <code>Buffer</code> | type typed buffer we are sending |
| buffer | <code>Buffer</code> | the buffer we are sending |
| binary_mode | <code>boolean</code> | true if we are sending in binary mode (should always be true) |

<a name="SockhopClient+debug_received_buffer"></a>

### "debug:received:buffer" (object, buffer, binary_mode)
received typed buffer event

NOTE : This event is only emitted if the SockhopClient is in debug mode

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we just received |
| object.data | <code>object.data</code> | the typed buffer we just received |
| buffer | <code>Buffer</code> | the (raw) buffer we just received over the wire |
| binary_mode | <code>boolean</code> | true if we are receiving in binary mode (should always be true) |

<a name="SockhopClient+event_binary_mode_rx"></a>

### "binary_mode:rx" (enabled)
binary_mode:rx object event

If true, the other end of the connection will (from this packet onward) be sending us data in binary mode

If false, the other end of the connection was reset, and so a renegotiation of binary mode may be necessary
both the other side will be sending in binary mode again.

NOTE : the `true` variant of this event has undetermined ordering with respect to the firing
       of `handshake`, meaning it could fire before or after `handshake`, depending on network timing.
       This is largely irrelevant, since the this event is related to how the library
       internally handles parsing incoming data, and not how we send data. Think of this
       event as informational only about the state of the other side of the connection.

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | true if we are now receiving in binary mode |

<a name="SockhopClient+event_binary_mode_tx"></a>

### "binary_mode:tx" (enabled)
binary_mode:tx object event

If true, we will (from this packet onward) be sending data in binary mode.

If false, the connection was reset, and so a renegotiation of binary mode may be necessary before
we can send data in binary mode again.

NOTE : if the handshake fails or times out, this event *will not* fire with `false`, since
       we are already not in binary mode. However, you can always check the state of binary mode
       using the `.binary_mode.tx` property. The `false` event will fire on any disconnect if the
       system was in binary mode to begih with

NOTE : the `true` variant of this event will always fire *before* the `handshake` event,
       which means that you don't need to wait for both this event and `handshake`
       to know that your tx-ing data encoding has settled. As a result, you can probably
       ignore this event entirely, unless you are doing something really low-level.

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | true if we are now receiving in binary mode |

<a name="SockhopError"></a>

## SockhopError ⇐ <code>Error</code>
Custom sockhop errors

Error types, should only change with major versions
  - ERR_MULTICONNECT : attempting to call connect while a socket is already connecting
  - ERR_SOCKET_DESTROYED : attempting to interact with a destroyed socket
  - ERR_REMOTE_CALLBACK_TYPE : attempting to use remote callbacks with wrong message types, or not a callback function
  - ERR_REQUEST_TYPE : attempting to use requests with wrong message types
  - ERR_NO_SOCKET : attempting to send a message with no socket
  - ERR_BAD_DATA : attempting to send a message with no data payload
  - ERR_OBJECTBUFFER_BAD_BUFFER : attempting to do a buffer operation with a non-buffer
  - ERR_OBJECTBUFFER_BAD_BUFFER_DATA : attempting to do a buffer operation with bad data in the buffer
  - ERR_OBJECTBUFFER_BAD_OBJECT : attempting to do an object operation with a non-serializable object
  - ERR_RESPONSE_TIMEOUT : the response timed out
  - ERR_RESPONSE_SEND : the response could not be sent

**Kind**: global class  
**Extends**: <code>Error</code>  
<a name="new_SockhopError_new"></a>

### new SockhopError(message, code)
Constructs a new SockhopError


| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> | A message string describing the error |
| code | <code>string</code> | A standardized code for filtering error types |

<a name="SockhopPing"></a>

## SockhopPing
TCP Ping

Used internally when .ping() is called

**Kind**: global class  

* [SockhopPing](#SockhopPing)
    * [.unanswered()](#SockhopPing+unanswered) ⇒ <code>boolean</code>
    * [.conclude_with_pong(pong)](#SockhopPing+conclude_with_pong)

<a name="SockhopPing+unanswered"></a>

### sockhopPing.unanswered() ⇒ <code>boolean</code>
Unanswered

Is this ping Unanswered?

**Kind**: instance method of [<code>SockhopPing</code>](#SockhopPing)  
<a name="SockhopPing+conclude_with_pong"></a>

### sockhopPing.conclude\_with\_pong(pong)
Conclude a ping

Sets the returned, finished values

**Kind**: instance method of [<code>SockhopPing</code>](#SockhopPing)  

| Param | Type | Description |
| --- | --- | --- |
| pong | [<code>SockhopPong</code>](#SockhopPong) | the pong (ping reply) that is finishing this ping |

<a name="SockhopPong"></a>

## SockhopPong
TCP Ping reply

Used internally when .ping() is replied

**Kind**: global class  
<a name="SockhopServer"></a>

## SockhopServer ⇐ <code>EventEmitter</code>
Wrapped TCP server

When data is received by the server, the received Buffer is concatenated with previously
received Buffers until a delimiter (usually "\n") is received.  The composite Buffer is then treated
like a JSON string and converted to an object, which is triggers a "receive" event.
If the client is a SockhopClient, it will further wrap sent data in metadata that describes the type -
this allows you to pass custom objects (prototypes) across the wire, and the other end will know
it has received your Widget, or Foo, or whatever.  Plain objects, strings, etc. are also similarly labelled.
The resulting receive event has a "meta" parameter; meta.type will list the object type.

Of course, if your client is not a SockhopClient, you don't want this wrapping/unwrapping behavior
and you might want a different delimiter for JSON.  Both these parameters are configurable in the
constructor options.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  
**Emits**: [<code>connect</code>](#SockhopServer+event_connect), [<code>disconnect</code>](#SockhopServer+event_disconnect), [<code>unhandshake</code>](#SockhopServer+event_unhandshake), [<code>receive</code>](#SockhopServer+event_receive), [<code>receive:buffer</code>](#SockhopServer+receive_buffer), [<code>handshake</code>](#SockhopServer+event_handshake), [<code>debug:sending</code>](#SockhopServer+debug_sending), [<code>debug:sending:buffer</code>](#SockhopServer+debug_sending_buffer), [<code>debug:received</code>](#SockhopServer+debug_received), [<code>debug:received:buffer</code>](#SockhopServer+debug_received_buffer), <code>event:SockhopError</code>  

* [SockhopServer](#SockhopServer) ⇐ <code>EventEmitter</code>
    * [new SockhopServer([opts])](#new_SockhopServer_new)
    * [.sockets](#SockhopServer+sockets) : <code>Array.&lt;net.Socket&gt;</code>
    * [.sessions](#SockhopServer+sessions) : [<code>Array.&lt;SockhopSession&gt;</code>](#SockhopSession)
    * [.compatibility_mode](#SockhopServer+compatibility_mode) ⇒ <code>boolean</code>
    * [.debug](#SockhopServer+debug) ⇒ <code>boolean</code>
    * [.emit_async()](#SockhopServer+emit_async)
    * [.ping(delay)](#SockhopServer+ping)
    * [.listen()](#SockhopServer+listen) ⇒ <code>Promise.&lt;net.server&gt;</code>
    * [.get_bound_address()](#SockhopServer+get_bound_address) ⇒ <code>string</code>
    * [.send(socket, object, [callback])](#SockhopServer+send) ⇒ <code>Promise</code>
    * [.send_typed_buffer(socket, type, buff, [callback])](#SockhopServer+send_typed_buffer) ⇒ <code>Promise</code>
    * [.sendall(object)](#SockhopServer+sendall) ⇒ <code>Promise</code>
    * [.kill_socket(sock)](#SockhopServer+kill_socket) ⇒ <code>Promise</code>
    * [.disconnect()](#SockhopServer+disconnect) ⇒ <code>Promise</code>
    * [.close()](#SockhopServer+close) ⇒ <code>Promise</code>
    * ["connect" (sock, session)](#SockhopServer+event_connect)
    * ["handshake" (sock, session, success, error)](#SockhopServer+event_handshake)
    * ["receive" (object, meta)](#SockhopServer+event_receive)
    * ["receive:buffer" (buffer, meta)](#SockhopServer+receive_buffer)
    * ["disconnect" (sock, session, handshaked)](#SockhopServer+event_disconnect)
    * ["unhandshake" (sock, session)](#SockhopServer+event_unhandshake)
    * ["debug:sending" (object, buffer, binary_mode, sock, session)](#SockhopServer+debug_sending)
    * ["debug:received" (object, buffer, binary_mode, sock, session)](#SockhopServer+debug_received)
    * ["debug:sending:buffer" (object, buffer, binary_mode, sock, session)](#SockhopServer+debug_sending_buffer)
    * ["debug:received:buffer" (object, buffer, binary_mode, sock, session)](#SockhopServer+debug_received_buffer)

<a name="new_SockhopServer_new"></a>

### new SockhopServer([opts])
Constructs a new SockhopServer


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [opts] | <code>object</code> |  | an object containing configuration options |
| [opts.path] | <code>string</code> |  | the path for a Unix domain socket.  If used, this will override the address and port values. |
| [opts.address] | <code>string</code> | <code>&quot;\&quot;127.0.0.1\&quot;&quot;</code> | the IP address to bind to |
| [opts.port] | <code>number</code> | <code>50000</code> | the TCP port to use |
| [opts.terminator] | <code>string</code> \| <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the JSON object delimiter.  Passed directly to the JSONObjectBuffer constructor. |
| [opts.allow_non_objects] | <code>boolean</code> | <code>false</code> | allow non objects to be received and transmitted. Passed directly to the JSONObjectBuffer constructor. |
| [opts.session_type] | <code>Object</code> | <code>SockhopSession</code> | the identifier for a SockhopSession class (or inhereted class) |
| [opts.handshake_timeout] | <code>number</code> | <code>3000</code> | the length of time in ms to wait for a handshake response before timing out |
| [opts.compatibility_mode] | <code>boolean</code> | <code>false</code> | enable compatibility mode, which will disable handshakes for simulating 1.x behavior |
| [opts.debug] | <code>boolean</code> | <code>false</code> | run in debug mode -- which adds additional emits |
| [opts.allow_binary_mode] | <code>boolean</code> | <code>true</code> | request binary mode during handshake (ignored in compatibility mode) |
| [opts.allow_unsafe_encoding] | <code>boolean</code> | <code>false</code> | allow the binary_mode encodings to be 'unsafe' (i.e. not type checked), for faster preformance. Ingored if binary_mode is not enabled |

<a name="SockhopServer+sockets"></a>

### sockhopServer.sockets : <code>Array.&lt;net.Socket&gt;</code>
Socket getter

**Kind**: instance property of [<code>SockhopServer</code>](#SockhopServer)  
<a name="SockhopServer+sessions"></a>

### sockhopServer.sessions : [<code>Array.&lt;SockhopSession&gt;</code>](#SockhopSession)
Session getter

**Kind**: instance property of [<code>SockhopServer</code>](#SockhopServer)  
<a name="SockhopServer+compatibility_mode"></a>

### sockhopServer.compatibility\_mode ⇒ <code>boolean</code>
compatibility_mode getter

**Kind**: instance property of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: <code>boolean</code> - compatibility_mode whether or not we are in compatibility mode  
<a name="SockhopServer+debug"></a>

### sockhopServer.debug ⇒ <code>boolean</code>
debug mode getter

**Kind**: instance property of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: <code>boolean</code> - debug whether or not we are in debug mode  
<a name="SockhopServer+emit_async"></a>

### sockhopServer.emit\_async()
Emit async

We end up with odd event loops sometimes, e.g. if an on("disconnect") calls .sendall(), another "disconnect" will be emitted.
This functon emits evens asynchronously and breaks the chain
//HACK  -- THIS IS A HACKY FIX -- //HACK

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
<a name="SockhopServer+ping"></a>

### sockhopServer.ping(delay)
Ping

Ping all clients, detect timeouts. Only works if connected to a SockhopClient.

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| delay | <code>number</code> | <code>0</code> | in ms (0 disables ping) |

<a name="SockhopServer+listen"></a>

### sockhopServer.listen() ⇒ <code>Promise.&lt;net.server&gt;</code>
Listen

Bind and wait for incoming connections

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
<a name="SockhopServer+get_bound_address"></a>

### sockhopServer.get\_bound\_address() ⇒ <code>string</code>
Get bound address

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: <code>string</code> - the IP address we are bound to  
<a name="SockhopServer+send"></a>

### sockhopServer.send(socket, object, [callback]) ⇒ <code>Promise</code>
Send

This will appear on the remote side as a receive event

Send an object to one clients

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Throws**:

- SockhopError


| Param | Type | Description |
| --- | --- | --- |
| socket | <code>net.socket</code> | on which to send it |
| object | <code>object</code> | that we want to send |
| [callback] | <code>function</code> | Callback when remote side calls meta.done (see receive event) - this is basically a remote Promise |

<a name="SockhopServer+send_typed_buffer"></a>

### sockhopServer.send\_typed\_buffer(socket, type, buff, [callback]) ⇒ <code>Promise</code>
Send a buffer with a type descriptor

This will appaer on the remote side as a receive:buffer event

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 


| Param | Type | Description |
| --- | --- | --- |
| socket | <code>net.socket</code> | on which to send it |
| type | <code>string</code> | a type name for what the buffer encodes |
| buff | <code>Buffer</code> | the buffer to send |
| [callback] | <code>function</code> | Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise |

<a name="SockhopServer+sendall"></a>

### sockhopServer.sendall(object) ⇒ <code>Promise</code>
Sendall

Send an object to all clients

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | to send to all connected clients |

<a name="SockhopServer+kill_socket"></a>

### sockhopServer.kill\_socket(sock) ⇒ <code>Promise</code>
Stops a client connection

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the client socket to kill |

<a name="SockhopServer+disconnect"></a>

### sockhopServer.disconnect() ⇒ <code>Promise</code>
Disconnect

Disconnect all clients
Does not close the server - use close() for that

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: <code>Promise</code> - resolves when all sockets are killed  
<a name="SockhopServer+close"></a>

### sockhopServer.close() ⇒ <code>Promise</code>
Close

Disconnects any clients and closes the server

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: <code>Promise</code> - resovles when all sockets are killed and the server closed  
<a name="SockhopServer+event_connect"></a>

### "connect" (sock, session)
connect event

this fires when we have successfully connected to the client, but before the handshake completes/times-out

NOTE : unless you are in compatibility mode or trying to interoperate with a 1.x remote, you should probably
       wait for the `handshake` event instead of `connect`. See discussion in the `handshake` event docs for more information

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopServer+event_handshake"></a>

### "handshake" (sock, session, success, error)
handshake event

This fires when the handshake completes or times out

WARNING: if the other side of the connection get's a connect event, they can begin sending data immediately.
         regardless of whether or not the handshake completes or times out, or is simply ignored (compatibility mode
         or 1.x library version). This means data can be sent before the handshake completes, unless both sides
         have agreed to wait for the handshake event before sending any data. It is recommnded that in situations
         where you cannot gaurantee that both sides are using Sockhop 2.x with handshakes, that you should listen
         for the connection event for the purpose of adding event handlers, but wait for the handshake event
         to proactively send any data, so that the send logic can depending on a know handshake state. This will
         have the added benefit of ensuring that you will not try to tx until the binary mode negotiation is complete,
         (which finish immediately before the handshake event fires). Finally, this will allow a smooth transition
         when all 1.x/compoatibility mode clients are upgraded to 2.x with handshakes, since in that case, both
         sides will already be waiting for the handshake event before sending any data.

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |
| success | <code>boolean</code> | true if the handshake was successful, false if it timed out or failed |
| error | <code>Error</code> | if the handshake failed, this will contain the error, otherwise undefined |

<a name="SockhopServer+event_receive"></a>

### "receive" (object, meta)
receive object event

We have successfully received an object from the client

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the received object |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received object constructor ("Object", "String", "Widget", etc) |
| meta.socket | <code>net.Socket</code> | the socket that sent us this object |
| meta.session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |
| [meta.callback] | <code>function</code> | the callback function, if the client is requesting a callback. Pass an object you want returned to the client |

<a name="SockhopServer+receive_buffer"></a>

### "receive:buffer" (buffer, meta)
receive buffer event

We have successfully received a buffer from the server

NOTE : this will only fire in binary mode (rx) and if the remote end specifically called send_typed_buffer().
      If instead the remote end called send() with a Buffer, you will get a normal 'receive' event with the
      type set to "Buffer".

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | the received buffer |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received buffer type ("String", "Widget", etc) |
| meta.socket | <code>net.Socket</code> | the socket that sent us this object |
| meta.session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |
| meta.callback | <code>function</code> | if the received object was sent with a callback, this is the function to call to respond |

<a name="SockhopServer+event_disconnect"></a>

### "disconnect" (sock, session, handshaked)
disconnect event

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |
| handshaked | <code>boolean</code> | true if we were previously handshaked, false otherwise |

<a name="SockhopServer+event_unhandshake"></a>

### "unhandshake" (sock, session)
unhandshake event

This fires when we were previously handshaked, but the connection was lost. This is analogous
to the `disconnect` event, but only fires if we were previously handshaked. If you are interoperating
with a 1.x/compatibility mode remote, this event will not fire, since the handshake will never succeed.

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopServer+debug_sending"></a>

### "debug:sending" (object, buffer, binary_mode, sock, session)
sending event

NOTE : This event is only emitted if the SockhopServer is in debug mode

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we are sending |
| buffer | <code>Buffer</code> | the buffer we are sending |
| binary_mode | <code>boolean</code> | true if we are sending in binary mode |
| sock | <code>net.Socket</code> | the socket we are sending on |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopServer+debug_received"></a>

### "debug:received" (object, buffer, binary_mode, sock, session)
received event

NOTE : This event is only emitted if the SockhopServer is in debug mode

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we just received |
| buffer | <code>Buffer</code> | the buffer we just received |
| binary_mode | <code>boolean</code> | true if we are receiving in binary mode |
| sock | <code>net.Socket</code> | the socket we are receiving on |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopServer+debug_sending_buffer"></a>

### "debug:sending:buffer" (object, buffer, binary_mode, sock, session)
sending typed buffer event

NOTE : This event is only emitted if the SockhopServer is in debug mode

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we are sending |
| object.data | <code>Buffer</code> | type typed buffer we are sending |
| buffer | <code>Buffer</code> | the buffer we are sending |
| binary_mode | <code>boolean</code> | true if we are sending in binary mode (should always be true) |
| sock | <code>net.Socket</code> | the socket we are sending on |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopServer+debug_received_buffer"></a>

### "debug:received:buffer" (object, buffer, binary_mode, sock, session)
received typed buffer event

NOTE : This event is only emitted if the SockhopServer is in debug mode

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we just received |
| object.data | <code>object.data</code> | the typed buffer we just received |
| buffer | <code>Buffer</code> | the (raw) buffer we just received over the wire |
| binary_mode | <code>boolean</code> | true if we are receiving in binary mode (should always be true) |
| sock | <code>net.Socket</code> | the socket we are receiving on |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopSession"></a>

## SockhopSession ⇐ <code>EventEmitter</code>
Base class wrapper for server-side sockets

When a new connection is received by the server, the server will wrap
that socket with an instance of this (or child of this) class -- configurable
with the `session_type` option in the server's constructor. This class
allows for arbitrary user-data to be assigned to the clients (for example,
authentication state information) without having to abuse the underlying
net.Socket object.

This class does almost nothing, apart from holding internal references to
the net.Socket and SockhopServer instances, and is really intended to be
extended. As such, there are several 'virtual' methods included here,
which users are encouraged to implement for their specific application.

Sessions are the preferred way for users to interact with client connections,
in that users should write child classes which inhert from this base class to
interact with the net.Socket instance, and then have their applications call
the session methods, rather than calling socket methods directly. For instance,
users are discouraged from directly calling `socket.end()` to terminate
clients connection from the server. Rather, users should call `session.kill()`.

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  
**Emits**: [<code>handshake</code>](#SockhopSession+event_handshake), [<code>unhandshake</code>](#SockhopSession+event_unhandshake), [<code>disconnect</code>](#SockhopSession+event_disconnect), [<code>receive</code>](#SockhopSession+event_receive), [<code>receive:buffer</code>](#SockhopSession+receive_buffer), [<code>debug:sending</code>](#SockhopSession+debug_sending), [<code>debug:received</code>](#SockhopSession+debug_received), [<code>binary\_mode:rx</code>](#SockhopSession+event_binary_mode_rx), [<code>binary\_mode:tx</code>](#SockhopSession+event_binary_mode_tx)  

* [SockhopSession](#SockhopSession) ⇐ <code>EventEmitter</code>
    * [new SockhopSession(sock, server)](#new_SockhopSession_new)
    * [.sock](#SockhopSession+sock) : <code>net.Socket</code>
    * [.server](#SockhopSession+server) : [<code>SockhopServer</code>](#SockhopServer)
    * [.init_complete](#SockhopSession+init_complete) ⇒ <code>boolean</code>
    * [.binary_mode](#SockhopSession+binary_mode) ⇒ <code>object</code> \| <code>boolean</code> \| <code>boolean</code>
    * [.handshake_successful](#SockhopSession+handshake_successful) ⇒ <code>boolean</code>
    * [.send_typed_buffer(type, buff, [callback])](#SockhopSession+send_typed_buffer) ⇒ <code>Promise</code>
    * [.send(obj, [callback])](#SockhopSession+send) ⇒ <code>Promise</code>
    * [.kill()](#SockhopSession+kill) ⇒ <code>Promise</code>
    * *[.start()](#SockhopSession+start) ⇒ <code>Promise</code>*
    * *[.end()](#SockhopSession+end) ⇒ <code>Promise</code>*
    * ["handshake" (success, error)](#SockhopSession+event_handshake)
    * ["receive" (object, meta)](#SockhopSession+event_receive)
    * ["unhandshake"](#SockhopSession+event_unhandshake)
    * ["disconnect" (handshaked)](#SockhopSession+event_disconnect)
    * ["debug:sending" (object, buffer, binary_mode)](#SockhopSession+debug_sending)
    * ["debug:received" (object, buffer, binary_mode)](#SockhopSession+debug_received)
    * ["debug:sending:buffer" (object, buffer, binary_mode)](#SockhopSession+debug_sending_buffer)
    * ["debug:received:buffer" (object, buffer, binary_mode)](#SockhopSession+debug_received_buffer)
    * ["receive:buffer" (buffer, meta)](#SockhopSession+receive_buffer)
    * ["binary_mode:rx" (enabled)](#SockhopSession+event_binary_mode_rx)
    * ["binary_mode:tx" (enabled)](#SockhopSession+event_binary_mode_tx)

<a name="new_SockhopSession_new"></a>

### new SockhopSession(sock, server)
Constructor

By default, I just save references to the socket and the server


| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket object |
| server | [<code>SockhopServer</code>](#SockhopServer) | a reference to the SockhopServer |

<a name="SockhopSession+sock"></a>

### sockhopSession.sock : <code>net.Socket</code>
Getter for the underlying session socket

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
<a name="SockhopSession+server"></a>

### sockhopSession.server : [<code>SockhopServer</code>](#SockhopServer)
Getter for the server

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
<a name="SockhopSession+init_complete"></a>

### sockhopSession.init\_complete ⇒ <code>boolean</code>
init_complete getter

NOTE : this will be true if the client is in compatibility mode and connected, since no handshake is expected

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>boolean</code> - init_complete is the client still expecting to run more initialization steps (e.g. handshake)  
<a name="SockhopSession+binary_mode"></a>

### sockhopSession.binary\_mode ⇒ <code>object</code> \| <code>boolean</code> \| <code>boolean</code>
binary_mode getter

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>object</code> - binary_mode the current binary mode status<code>boolean</code> - binary_mode.rx true if we are receiving in binary mode<code>boolean</code> - binary_mode.tx true if we are transmitting in binary mode  
<a name="SockhopSession+handshake_successful"></a>

### sockhopSession.handshake\_successful ⇒ <code>boolean</code>
handshake_successful getter

NOTE : this will be false if the handshake has not yet completed, or if the client is in compatibility mode

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>boolean</code> - handshake_successful whether or not the last handshake was successful  
<a name="SockhopSession+send_typed_buffer"></a>

### sockhopSession.send\_typed\_buffer(type, buff, [callback]) ⇒ <code>Promise</code>
Send a buffer with a type descriptor

This will appaer on the remote side as a receive:buffer event

**Kind**: instance method of [<code>SockhopSession</code>](#SockhopSession)  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 


| Param | Type | Description |
| --- | --- | --- |
| type | <code>string</code> | a type name for what the buffer encodes |
| buff | <code>Buffer</code> | the buffer to send |
| [callback] | <code>function</code> | Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise |

<a name="SockhopSession+send"></a>

### sockhopSession.send(obj, [callback]) ⇒ <code>Promise</code>
Send a message over this session

This will appear on the remote side as a receive event

**Kind**: instance method of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>Promise</code> - resolves on send  
**Throws**:

- [<code>SockhopError</code>](#SockhopError) 


| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> |  |
| [callback] | <code>function</code> | Callback when remote side calls meta.done (see receive event) - this is basically a remote Promise |

<a name="SockhopSession+kill"></a>

### sockhopSession.kill() ⇒ <code>Promise</code>
Kill this session

**Kind**: instance method of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>Promise</code> - resolves on socket end  
<a name="SockhopSession+start"></a>

### *sockhopSession.start() ⇒ <code>Promise</code>*
Start this session

Override me to do any setup of the session.

I get called internally by the SockhopServer immediately after
a new client connects to the server, before the server emits the
'connect' event. (before even the socket gets registered in the
server's `server._sockets` list).

**Kind**: instance abstract method of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>Promise</code> - resolves when setup is complete  
<a name="SockhopSession+end"></a>

### *sockhopSession.end() ⇒ <code>Promise</code>*
End this session

Override me to do any teardown of the session

I get called internally by the SockhopServer immediately after
the client's socket emits the 'end' event, and when I resolve, I
then trigger the server to emit the 'disconnect' event.

**Kind**: instance abstract method of [<code>SockhopSession</code>](#SockhopSession)  
**Returns**: <code>Promise</code> - resolves when teardown is complete  
<a name="SockhopSession+event_handshake"></a>

### "handshake" (success, error)
handshake event

This fires when the handshake completes or times out

WARNING: if the other side of the connection get's a connect event, they can begin sending data immediately.
         regardless of whether or not the handshake completes or times out, or is simply ignored (compatibility mode
         or 1.x library version). This means data can be sent before the handshake completes, unless both sides
         have agreed to wait for the handshake event before sending any data. It is recommnded that in situations
         where you cannot gaurantee that both sides are using Sockhop 2.x with handshakes, that you should listen
         for the connection event for the purpose of adding event handlers, but wait for the handshake event
         to proactively send any data, so that the send logic can depending on a know handshake state. This will
         have the added benefit of ensuring that you will not try to tx until the binary mode negotiation is complete,
         (which finish immediately before the handshake event fires). Finally, this will allow a smooth transition
         when all 1.x/compoatibility mode clients are upgraded to 2.x with handshakes, since in that case, both
         sides will already be waiting for the handshake event before sending any data.

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| success | <code>boolean</code> | true if the handshake was successful, false if it timed out or failed |
| error | <code>Error</code> | if the handshake failed, this will contain the error, otherwise undefined |

<a name="SockhopSession+event_receive"></a>

### "receive" (object, meta)
receive object event

We have successfully received an object from the server

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the received object |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received object constructor ("Object", "String", "Widget", etc) |
| meta.callback | <code>function</code> | if the received object was sent with a callback, this is the function to call to respond |

<a name="SockhopSession+event_unhandshake"></a>

### "unhandshake"
unhandshake event

This fires when we were previously handshaked, but the connection was lost. This is analogous
to the `disconnect` event, but only fires if we were previously handshaked. If you are interoperating
with a 1.x/compatibility mode remote, this event will not fire, since the handshake will never succeed.

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  
<a name="SockhopSession+event_disconnect"></a>

### "disconnect" (handshaked)
disconnect event

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| handshaked | <code>boolean</code> | true if we were previously handshaked, false otherwise |

<a name="SockhopSession+debug_sending"></a>

### "debug:sending" (object, buffer, binary_mode)
sending event

NOTE : This event is only emitted if the SockhopSession is in debug mode

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we are sending |
| buffer | <code>Buffer</code> | the buffer we are sending |
| binary_mode | <code>boolean</code> | true if we are sending in binary mode |

<a name="SockhopSession+debug_received"></a>

### "debug:received" (object, buffer, binary_mode)
received event

NOTE : This event is only emitted if the SockhopSession is in debug mode

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we just received |
| buffer | <code>Buffer</code> | the buffer we just received |
| binary_mode | <code>boolean</code> | true if we are receiving in binary mode |

<a name="SockhopSession+debug_sending_buffer"></a>

### "debug:sending:buffer" (object, buffer, binary_mode)
sending typed buffer event

NOTE : This event is only emitted if the SockhopSession is in debug mode

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we are sending |
| object.data | <code>Buffer</code> | type typed buffer we are sending |
| buffer | <code>Buffer</code> | the buffer we are sending |
| binary_mode | <code>boolean</code> | true if we are sending in binary mode (should always be true) |

<a name="SockhopSession+debug_received_buffer"></a>

### "debug:received:buffer" (object, buffer, binary_mode)
received typed buffer event

NOTE : This event is only emitted if the SockhopSession is in debug mode

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the object we just received |
| object.data | <code>object.data</code> | the typed buffer we just received |
| buffer | <code>Buffer</code> | the (raw) buffer we just received over the wire |
| binary_mode | <code>boolean</code> | true if we are receiving in binary mode (should always be true) |

<a name="SockhopSession+receive_buffer"></a>

### "receive:buffer" (buffer, meta)
receive buffer event

We have successfully received a buffer from the server

NOTE : this will only fire in binary mode (rx) and if the remote end specifically called send_typed_buffer().
      If instead the remote end called send() with a Buffer, you will get a normal 'receive' event with the
      type set to "Buffer".

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | the received buffer |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received buffer type ("String", "Widget", etc) |
| meta.callback | <code>function</code> | if the received object was sent with a callback, this is the function to call to respond |

<a name="SockhopSession+event_binary_mode_rx"></a>

### "binary_mode:rx" (enabled)
binary_mode:rx object event

The other end of the connection will (from this packet onward) be sending us data in binary mode

NOTE : for the session, this event will never fire with `false`, since we don't
       support reconnects on the server side. So in a socket lifecycle, this event
       *might* fire exactly once with `true` in the vacinity of the `handshake` event.

NOTE : this event is has undetermined ordering with respect to the firing of `handshake`,
       meaning it could fire before or after `handshake`, depending on network timing.
       This is largely irrelevant, since the this event is related to how the library
       internally handles parsing incoming data, and not how we send data. Think of this
       event as informational only about the state of the other side of the connection.

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | true if we are now receiving in binary mode |

<a name="SockhopSession+event_binary_mode_tx"></a>

### "binary_mode:tx" (enabled)
binary_mode:tx object event

We will (from this packet onward) be sending data in binary mode.

NOTE : if the handshake fails or times out, this event *will not* fire with `false`, since
       we are already not in binary mode. However, you can always check the state of binary mode
       using the `.binary_mode.tx` property.

NOTE : More importantly, for the session, this event will *never* fire with `false`, since we don't
       support reconnects on the server side. So in a socket lifecycle, this event
       *might* fire exactly once with `true` just prior to the `handshake` event.

NOTE : the `true` variant of this event will always fire *before* the `handshake` event,
       which means that you don't need to wait for both this event and `handshake`
       to know that your tx-ing data encoding has settled. As a result, you can probably
       ignore this event entirely, unless you are doing something really low-level.

**Kind**: event emitted by [<code>SockhopSession</code>](#SockhopSession)  

| Param | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | true if we are now receiving in binary mode |


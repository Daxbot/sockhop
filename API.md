## Classes

<dl>
<dt><a href="#ObjectBuffer">ObjectBuffer</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Object Buffer</p>
<p>de/serialize objects to/from a Buffer</p>
<p>Automatically reassembles fragmented buffers (useful when the buffer passes through
a socket, for example, and is received in pieces) and gives you your object back</p>
</dd>
<dt><a href="#SockhopClient">SockhopClient</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Wrapped TCP client</p>
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

<a name="ObjectBuffer"></a>

## ObjectBuffer ⇐ <code>EventEmitter</code>
Object Buffer

de/serialize objects to/from a Buffer

Automatically reassembles fragmented buffers (useful when the buffer passes through
a socket, for example, and is received in pieces) and gives you your object back

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  

* [ObjectBuffer](#ObjectBuffer) ⇐ <code>EventEmitter</code>
    * [new ObjectBuffer(opts)](#new_ObjectBuffer_new)
    * [.buf2obj(buffer)](#ObjectBuffer+buf2obj) ⇒ <code>Array</code>
    * [.obj2buf(object, buffer)](#ObjectBuffer+obj2buf)

<a name="new_ObjectBuffer_new"></a>

### new ObjectBuffer(opts)
Constructs a new ObjectBuffer


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>object</code> |  | the options |
| [opts.terminator] | <code>string</code> \| <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the terminator to signal the end of a JSON object. If an array is given, the first element is a receive (buf2obj) terminator and the second is the transmit (obj2buf) element |
| [opts.allow_non_objects] | <code>boolean</code> | <code>false</code> | allow non objects in buf2obj (will be passed through as Strings) |

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

### objectBuffer.obj2buf(object, buffer)
obj2buf

Convert an Object to a Buffer

**Kind**: instance method of [<code>ObjectBuffer</code>](#ObjectBuffer)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object</code> | the object to convert |
| buffer | <code>Buffer</code> | the buffer representing that object |

<a name="SockhopClient"></a>

## SockhopClient ⇐ <code>EventEmitter</code>
Wrapped TCP client

**Kind**: global class  
**Extends**: <code>EventEmitter</code>  
**Emits**: [<code>connect</code>](#SockhopClient+event_connect), [<code>disconnect</code>](#SockhopClient+event_disconnect), [<code>receive</code>](#SockhopClient+event_receive), <code>event:Error</code>  

* [SockhopClient](#SockhopClient) ⇐ <code>EventEmitter</code>
    * [new SockhopClient([opts])](#new_SockhopClient_new)
    * [.connected](#SockhopClient+connected) ⇒ <code>boolean</code>
    * [.auto_reconnect](#SockhopClient+auto_reconnect) ⇒ <code>boolean</code>
    * [.auto_reconnect](#SockhopClient+auto_reconnect)
    * [.socket](#SockhopClient+socket)
    * [.socket](#SockhopClient+socket) ⇒ <code>net.socket</code>
    * [._perform_auto_reconnect()](#SockhopClient+_perform_auto_reconnect)
    * [.connect()](#SockhopClient+connect) ⇒ <code>Promise</code>
    * [.get_bound_address()](#SockhopClient+get_bound_address) ⇒ <code>string</code>
    * [.send(object, [rcallback])](#SockhopClient+send) ⇒ <code>Promise</code>
    * [.ping(delay)](#SockhopClient+ping)
    * [.disconnect()](#SockhopClient+disconnect) ⇒
    * ["connect" (sock)](#SockhopClient+event_connect)
    * ["receive" (object, meta)](#SockhopClient+event_receive)
    * ["disconnect" (sock)](#SockhopClient+event_disconnect)

<a name="new_SockhopClient_new"></a>

### new SockhopClient([opts])
Constructs a new SockhopClient


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [opts] | <code>object</code> |  | an object containing configuration options |
| [opts.path] | <code>string</code> |  | the path for a Unix domain socket.  If used, this will override the address and port values. |
| [opts.address] | <code>string</code> | <code>&quot;\&quot;127.0.0.1\&quot;&quot;</code> | the IP address to bind to |
| [opts.port] | <code>number</code> | <code>50000</code> | the TCP port to use |
| [opts.auto_reconnect_interval] | <code>number</code> | <code>2000</code> | the auto reconnection interval, in ms. |
| opts.peer_type | <code>string</code> |  | the type of client to expect.  Defaults to "Sockhop" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects |
| [opts.terminator] | <code>string</code> \| <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the JSON object delimiter.  Passed directly to the ObjectBuffer constructor. |
| [opts.allow_non_objects] | <code>boolean</code> | <code>false</code> | allow non objects to be received and transmitted. Passed directly to the ObjectBuffer constructor. |

<a name="SockhopClient+connected"></a>

### sockhopClient.connected ⇒ <code>boolean</code>
connected

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - connected whether or not we are currently connected  
<a name="SockhopClient+auto_reconnect"></a>

### sockhopClient.auto\_reconnect ⇒ <code>boolean</code>
auto_reconnect getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>boolean</code> - auto_reconnect the current auto_reconnect setting  
<a name="SockhopClient+auto_reconnect"></a>

### sockhopClient.auto\_reconnect
auto_reconnect setter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| auto_reconnect | <code>boolean</code> | the desired auto_reconnect setting |

<a name="SockhopClient+socket"></a>

### sockhopClient.socket
Socket setter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| socket | <code>net.socket</code> | a new socket to set up |

<a name="SockhopClient+socket"></a>

### sockhopClient.socket ⇒ <code>net.socket</code>
Socket getter

**Kind**: instance property of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>net.socket</code> - underlying socket object  
<a name="SockhopClient+_perform_auto_reconnect"></a>

### sockhopClient.\_perform\_auto\_reconnect()
Perform an auto reconnet (internal)

We have determined that an auto reconnect is necessary.
We will initiate it, and manage the fallout.

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+connect"></a>

### sockhopClient.connect() ⇒ <code>Promise</code>
Connect

Connect to the server
If you want to quietly start an auto_reconnect sequence to an unavailable server, just set .auto_reconnect=true.
Calling this directly will get you a Promise rejection if you are not able to connect the first time.
N.B.: The internals of net.socket add their own "connect" listener, so we can't rely on things like sock.removeAllListeners("connect") or sock.listenerCount("connect") here

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
<a name="SockhopClient+get_bound_address"></a>

### sockhopClient.get\_bound\_address() ⇒ <code>string</code>
Get bound address

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: <code>string</code> - the IP address we are bound to  
<a name="SockhopClient+send"></a>

### sockhopClient.send(object, [rcallback]) ⇒ <code>Promise</code>
Send

Send an object to the server

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Throws**:

- <code>Error</code> 


| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | to be sent over the wire |
| [rcallback] | <code>function</code> | Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise |

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

### sockhopClient.disconnect() ⇒
disconnect

Disconnect the socket (send FIN)
Pinging will also be turned off... if you want to keep pinging, you will need to call .ping() again after you connect again

**Kind**: instance method of [<code>SockhopClient</code>](#SockhopClient)  
**Returns**: Promise  
<a name="SockhopClient+event_connect"></a>

### "connect" (sock)
connect event

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |

<a name="SockhopClient+event_receive"></a>

### "receive" (object, meta)
receive event

We have successfully received an object from the server

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the received object |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received object constructor ("Object", "String", "Widget", etc) |

<a name="SockhopClient+event_disconnect"></a>

### "disconnect" (sock)
disconnect event

**Kind**: event emitted by [<code>SockhopClient</code>](#SockhopClient)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |

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
**Emits**: [<code>connect</code>](#SockhopServer+event_connect), [<code>disconnect</code>](#SockhopServer+event_disconnect), [<code>receive</code>](#SockhopServer+event_receive), <code>event:Error</code>  

* [SockhopServer](#SockhopServer) ⇐ <code>EventEmitter</code>
    * [new SockhopServer([opts])](#new_SockhopServer_new)
    * [.sockets](#SockhopServer+sockets) ⇒ <code>Array.&lt;net.Socket&gt;</code>
    * [.sessions](#SockhopServer+sessions) ⇒ [<code>Array.&lt;SockhopSession&gt;</code>](#SockhopSession)
    * [.emit_async()](#SockhopServer+emit_async)
    * [.ping(delay)](#SockhopServer+ping)
    * [.listen()](#SockhopServer+listen) ⇒ <code>Promise</code>
    * [.get_bound_address()](#SockhopServer+get_bound_address) ⇒ <code>string</code>
    * [.send(socket, object, [callback])](#SockhopServer+send) ⇒ <code>Promise</code>
    * [.sendall(object)](#SockhopServer+sendall) ⇒ <code>Promise</code>
    * [.kill_socket(sock)](#SockhopServer+kill_socket) ⇒ <code>Promise</code>
    * [.disconnect()](#SockhopServer+disconnect) ⇒ <code>Promise</code>
    * [.close()](#SockhopServer+close) ⇒
    * ["connect" (sock, session)](#SockhopServer+event_connect)
    * ["receive" (object, meta)](#SockhopServer+event_receive)
    * ["disconnect" (sock, session)](#SockhopServer+event_disconnect)

<a name="new_SockhopServer_new"></a>

### new SockhopServer([opts])
Constructs a new SockhopServer


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [opts] | <code>object</code> |  | an object containing configuration options |
| [opts.path] | <code>string</code> |  | the path for a Unix domain socket.  If used, this will override the address and port values. |
| [opts.address] | <code>string</code> | <code>&quot;\&quot;127.0.0.1\&quot;&quot;</code> | the IP address to bind to |
| [opts.port] | <code>number</code> | <code>50000</code> | the TCP port to use |
| [opts.auto_reconnect_interval] | <code>number</code> | <code>2000</code> | the auto reconnection interval, in ms. |
| [opts.terminator] | <code>string</code> \| <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the JSON object delimiter.  Passed directly to the ObjectBuffer constructor. |
| [opts.allow_non_objects] | <code>boolean</code> | <code>false</code> | allow non objects to be received and transmitted. Passed directly to the ObjectBuffer constructor. |
| [opts.peer_type] | <code>string</code> | <code>&quot;\&quot;SockhopClient\&quot;&quot;</code> | the type of client to expect.  Defaults to "SockhopClient" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects |
| [opts.session_type] | <code>Object</code> | <code>SockhopSession</code> | the identifier for a SockhopSession class (or inhereted class) |

<a name="SockhopServer+sockets"></a>

### sockhopServer.sockets ⇒ <code>Array.&lt;net.Socket&gt;</code>
Socket getter

**Kind**: instance property of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: <code>Array.&lt;net.Socket&gt;</code> - the underlying socket objects for our clients  
<a name="SockhopServer+sessions"></a>

### sockhopServer.sessions ⇒ [<code>Array.&lt;SockhopSession&gt;</code>](#SockhopSession)
Session getter

**Kind**: instance property of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: [<code>Array.&lt;SockhopSession&gt;</code>](#SockhopSession) - the underlying session instances for our clients  
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

### sockhopServer.listen() ⇒ <code>Promise</code>
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

Send an object to one clients

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Throw**: Error  

| Param | Type | Description |
| --- | --- | --- |
| socket | <code>net.socket</code> | on which to send it |
| object | <code>object</code> | that we want to send |
| [callback] | <code>function</code> | Callback when remote side calls meta.done (see receive event) - this is basically a remote Promise |

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
<a name="SockhopServer+close"></a>

### sockhopServer.close() ⇒
Close

Disconnects any clients and closes the server

**Kind**: instance method of [<code>SockhopServer</code>](#SockhopServer)  
**Returns**: Promise  
<a name="SockhopServer+event_connect"></a>

### "connect" (sock, session)
connect event

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |
| session | [<code>SockhopSession</code>](#SockhopSession) | the session of the socket |

<a name="SockhopServer+event_receive"></a>

### "receive" (object, meta)
receive event

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

<a name="SockhopServer+event_disconnect"></a>

### "disconnect" (sock, session)
disconnect event

**Kind**: event emitted by [<code>SockhopServer</code>](#SockhopServer)  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |
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

* [SockhopSession](#SockhopSession) ⇐ <code>EventEmitter</code>
    * [new SockhopSession(sock, server)](#new_SockhopSession_new)
    * [.sock](#SockhopSession+sock) ⇒ <code>net.Socket</code>
    * [.server](#SockhopSession+server) ⇒ [<code>SockhopServer</code>](#SockhopServer)
    * [.kill()](#SockhopSession+kill) ⇒ <code>Promise</code>
    * *[.start()](#SockhopSession+start) ⇒ <code>Promise</code>*
    * *[.end()](#SockhopSession+end) ⇒ <code>Promise</code>*

<a name="new_SockhopSession_new"></a>

### new SockhopSession(sock, server)
Constructor

By default, I just save references to the socket and the server


| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket object |
| server | [<code>SockhopServer</code>](#SockhopServer) | a reference to the SockhopServer |

<a name="SockhopSession+sock"></a>

### sockhopSession.sock ⇒ <code>net.Socket</code>
Getter for the underlying session socket

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
<a name="SockhopSession+server"></a>

### sockhopSession.server ⇒ [<code>SockhopServer</code>](#SockhopServer)
Getter for the server

**Kind**: instance property of [<code>SockhopSession</code>](#SockhopSession)  
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
server's `._sockets` list).

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

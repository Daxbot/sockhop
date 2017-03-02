# Sockhop

Node.js socket server and client with all the painful stuff taken out.  


- Easy wrappers over the tricky parts of net.socket
- Object centric - put a string, object, Widget, whatever into one end and it comes out the other
- Auto reconnect  
- Pass objects directly across the socket
- Ping with auto disconnect/reconnect
- Manages binary buffers across the wire, reconstructs fragmented JSON buffers (see lib/ObjectBuffer.js)
- Server options for talking to (non Sockhop) other clients

## Example
```javascript

	// Client
	var c=new Sockhop.client({auto_reconnect: true});
	c.on("connect",()=>c.ping(1000)); 	// Ping server every 1000ms, detect problems
	c.on("receive", (obj, metadata)=>console.log("I got a "+metadata.type));

	// Server
	var s=new Sockhop.server();

	// Connect
	s.listen()
	.then(()=>c.connect())
	.then(()=>{

		// Send everyone a Widget
		s.sendall(new Widget());

		// Send everyone something else
		s.sendall({
			"name" : "Joe",
			"age"  : 105
		});

	});


```

## Notes
Sockhop easily passes objects across the wire.  If you pack/transcode JS in a way that mutates class names, this functionality will be broken!  This includes auto ping functionality.

## Classes

<dl>
<dt><a href="#SockhopPing">SockhopPing</a></dt>
<dd><p>TCP Ping</p>
<p>Used internally when .ping() is called</p>
</dd>
<dt><a href="#SockhopPong">SockhopPong</a></dt>
<dd><p>TCP Ping reply</p>
<p>Used internally when .ping() is replied</p>
</dd>
<dt><a href="#SockhopClient">SockhopClient</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Wrapped TCP client</p>
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
<dt><a href="#ObjectBuffer">ObjectBuffer</a> ⇐ <code>EventEmitter</code></dt>
<dd><p>Object Buffer</p>
<p>de/serialize objects to/from a Buffer </p>
<p>Automatically reassembles fragmented buffers (useful when the buffer passes through 
a socket, for example, and is received in pieces) and gives you your object back</p>
</dd>
</dl>

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

**Kind**: instance method of <code>[SockhopPing](#SockhopPing)</code>  
<a name="SockhopPing+conclude_with_pong"></a>

### sockhopPing.conclude_with_pong(pong)
Conclude a ping 

Sets the returned, finished values

**Kind**: instance method of <code>[SockhopPing](#SockhopPing)</code>  

| Param | Type | Description |
| --- | --- | --- |
| pong | <code>[SockhopPong](#SockhopPong)</code> | the pong (ping reply) that is finishing this ping |

<a name="SockhopPong"></a>

## SockhopPong
TCP Ping reply

Used internally when .ping() is replied

**Kind**: global class  
<a name="SockhopClient"></a>

## SockhopClient ⇐ <code>EventEmitter</code>
Wrapped TCP client

**Kind**: global class  
**Extends:** <code>EventEmitter</code>  
**Emits**: <code>[connect](#SockhopClient+event_connect)</code>, <code>[disconnect](#SockhopClient+event_disconnect)</code>, <code>[receive](#SockhopClient+event_receive)</code>, <code>event:Error</code>  

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
    * [.send(object)](#SockhopClient+send) ⇒ <code>Promise</code>
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
| [opts.address] | <code>string</code> | <code>&quot;\&quot;127.0.0.1\&quot;&quot;</code> | the IP address to bind to |
| [opts.port] | <code>number</code> | <code>50000</code> | the TCP port to use |
| [opts.auto_reconnect_interval] | <code>number</code> | <code>2000</code> | the auto reconnection interval, in ms. |
| [opts.terminator] | <code>string</code> &#124; <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the JSON object delimiter.  Passed directly to the ObjectBuffer constructor. |

<a name="SockhopClient+connected"></a>

### sockhopClient.connected ⇒ <code>boolean</code>
connected

**Kind**: instance property of <code>[SockhopClient](#SockhopClient)</code>  
**Returns**: <code>boolean</code> - connected whether or not we are currently connected  
<a name="SockhopClient+auto_reconnect"></a>

### sockhopClient.auto_reconnect ⇒ <code>boolean</code>
auto_reconnect getter

**Kind**: instance property of <code>[SockhopClient](#SockhopClient)</code>  
**Returns**: <code>boolean</code> - auto_reconnect the current auto_reconnect setting  
<a name="SockhopClient+auto_reconnect"></a>

### sockhopClient.auto_reconnect
auto_reconnect setter

**Kind**: instance property of <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Description |
| --- | --- | --- |
| auto_reconnect | <code>boolean</code> | the desired auto_reconnect setting |

<a name="SockhopClient+socket"></a>

### sockhopClient.socket
Socket setter

**Kind**: instance property of <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Description |
| --- | --- | --- |
| socket | <code>net.socket</code> | a new socket to set up |

<a name="SockhopClient+socket"></a>

### sockhopClient.socket ⇒ <code>net.socket</code>
Socket getter

**Kind**: instance property of <code>[SockhopClient](#SockhopClient)</code>  
**Returns**: <code>net.socket</code> - underlying socket object  
<a name="SockhopClient+_perform_auto_reconnect"></a>

### sockhopClient._perform_auto_reconnect()
Perform an auto reconnet (internal)

We have determined that an auto reconnect is necessary.
We will initiate it, and manage the fallout.

**Kind**: instance method of <code>[SockhopClient](#SockhopClient)</code>  
<a name="SockhopClient+connect"></a>

### sockhopClient.connect() ⇒ <code>Promise</code>
Connect

Connect to the server
If you want to quietly start an auto_reconnect sequence to an unavailable server, just set .auto_reconnect=true.  
Calling this directly will get you a Promise rejection if you are not able to connect the first time.
N.B.: The internals of net.socket add their own "connect" listener, so we can't rely on things like sock.removeAllListeners("connect") or sock.listenerCount("connect") here

**Kind**: instance method of <code>[SockhopClient](#SockhopClient)</code>  
<a name="SockhopClient+get_bound_address"></a>

### sockhopClient.get_bound_address() ⇒ <code>string</code>
Get bound address

**Kind**: instance method of <code>[SockhopClient](#SockhopClient)</code>  
**Returns**: <code>string</code> - the IP address we are bound to  
<a name="SockhopClient+send"></a>

### sockhopClient.send(object) ⇒ <code>Promise</code>
Send

Send an object to the server

**Kind**: instance method of <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | to be sent over the wire |

<a name="SockhopClient+ping"></a>

### sockhopClient.ping(delay)
Ping

Send ping, detect timeouts.  If we have 4 timeouts in a row, we stop pinging, kill the connection and emit a 'disconnect' event.
You can then call .connect() again to reconnect.  Don't forget to re-enable pings.

**Kind**: instance method of <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| delay | <code>number</code> | <code>0</code> | in ms (0 disables ping) |

<a name="SockhopClient+disconnect"></a>

### sockhopClient.disconnect() ⇒
disconnect

Disconnect the socket (send FIN)

**Kind**: instance method of <code>[SockhopClient](#SockhopClient)</code>  
**Returns**: Promise  
<a name="SockhopClient+event_connect"></a>

### "connect" (sock)
connect event

**Kind**: event emitted by <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |

<a name="SockhopClient+event_receive"></a>

### "receive" (object, meta)
receive event

We have successfully received an object from the server

**Kind**: event emitted by <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the received object |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received object constructor ("Object", "String", "Widget", etc) |

<a name="SockhopClient+event_disconnect"></a>

### "disconnect" (sock)
disconnect event

**Kind**: event emitted by <code>[SockhopClient](#SockhopClient)</code>  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |

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
**Extends:** <code>EventEmitter</code>  
**Emits**: <code>[connect](#SockhopServer+event_connect)</code>, <code>[disconnect](#SockhopServer+event_disconnect)</code>, <code>[receive](#SockhopServer+event_receive)</code>, <code>event:Error</code>  

* [SockhopServer](#SockhopServer) ⇐ <code>EventEmitter</code>
    * [new SockhopServer([opts])](#new_SockhopServer_new)
    * [.sockets](#SockhopServer+sockets) ⇒ <code>array</code>
    * [.ping(delay)](#SockhopServer+ping)
    * [.listen()](#SockhopServer+listen) ⇒ <code>Promise</code>
    * [.get_bound_address()](#SockhopServer+get_bound_address) ⇒ <code>string</code>
    * [.send(socket, object)](#SockhopServer+send) ⇒ <code>Promise</code>
    * [.sendall(object)](#SockhopServer+sendall) ⇒ <code>Promise</code>
    * [.disconnect()](#SockhopServer+disconnect) ⇒ <code>Promise</code>
    * [.close()](#SockhopServer+close) ⇒
    * ["connect" (sock)](#SockhopServer+event_connect)
    * ["receive" (object, meta)](#SockhopServer+event_receive)
    * ["disconnect" (sock)](#SockhopServer+event_disconnect)

<a name="new_SockhopServer_new"></a>

### new SockhopServer([opts])
Constructs a new SockhopServer


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [opts] | <code>object</code> |  | an object containing configuration options |
| [opts.address] | <code>string</code> | <code>&quot;\&quot;127.0.0.1\&quot;&quot;</code> | the IP address to bind to |
| [opts.port] | <code>number</code> | <code>50000</code> | the TCP port to use |
| [opts.auto_reconnect_interval] | <code>number</code> | <code>2000</code> | the auto reconnection interval, in ms. |
| [opts.terminator] | <code>string</code> &#124; <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the JSON object delimiter.  Passed directly to the ObjectBuffer constructor. |
| opts.client_type | <code>string</code> |  | the type of client to expect.  Defaults to "SockhopClient" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects |

<a name="SockhopServer+sockets"></a>

### sockhopServer.sockets ⇒ <code>array</code>
Socket getter

**Kind**: instance property of <code>[SockhopServer](#SockhopServer)</code>  
**Returns**: <code>array</code> - the underlying socket objects for our clients  
<a name="SockhopServer+ping"></a>

### sockhopServer.ping(delay)
Ping

Ping all clients, detect timeouts. Only works if connected to a SockhopClient.

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| delay | <code>number</code> | <code>0</code> | in ms (0 disables ping) |

<a name="SockhopServer+listen"></a>

### sockhopServer.listen() ⇒ <code>Promise</code>
Listen

Bind and wait for incoming connections

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  
<a name="SockhopServer+get_bound_address"></a>

### sockhopServer.get_bound_address() ⇒ <code>string</code>
Get bound address

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  
**Returns**: <code>string</code> - the IP address we are bound to  
<a name="SockhopServer+send"></a>

### sockhopServer.send(socket, object) ⇒ <code>Promise</code>
Send

Send an object to one clients

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  
**Throw**: Error  

| Param | Type | Description |
| --- | --- | --- |
| socket | <code>net.socket</code> | on which to send it |
| object | <code>object</code> | that we want to send |

<a name="SockhopServer+sendall"></a>

### sockhopServer.sendall(object) ⇒ <code>Promise</code>
Sendall

Send an object to all clients

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | to send to all connected clients |

<a name="SockhopServer+disconnect"></a>

### sockhopServer.disconnect() ⇒ <code>Promise</code>
Disconnect

Disconnect all clients
Does not close the server - use close() for that

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  
<a name="SockhopServer+close"></a>

### sockhopServer.close() ⇒
Close

Disconnects any clients and closes the server

**Kind**: instance method of <code>[SockhopServer](#SockhopServer)</code>  
**Returns**: Promise  
<a name="SockhopServer+event_connect"></a>

### "connect" (sock)
connect event

**Kind**: event emitted by <code>[SockhopServer](#SockhopServer)</code>  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just connected |

<a name="SockhopServer+event_receive"></a>

### "receive" (object, meta)
receive event

We have successfully received an object from the client

**Kind**: event emitted by <code>[SockhopServer](#SockhopServer)</code>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>object</code> | the received object |
| meta | <code>object</code> | metadata |
| meta.type | <code>string</code> | the received object constructor ("Object", "String", "Widget", etc) |
| meta.socket | <code>net.Socket</code> | the socket that sent us this object |

<a name="SockhopServer+event_disconnect"></a>

### "disconnect" (sock)
disconnect event

**Kind**: event emitted by <code>[SockhopServer](#SockhopServer)</code>  

| Param | Type | Description |
| --- | --- | --- |
| sock | <code>net.Socket</code> | the socket that just disconnected |

<a name="ObjectBuffer"></a>

## ObjectBuffer ⇐ <code>EventEmitter</code>
Object Buffer

de/serialize objects to/from a Buffer 

Automatically reassembles fragmented buffers (useful when the buffer passes through 
a socket, for example, and is received in pieces) and gives you your object back

**Kind**: global class  
**Extends:** <code>EventEmitter</code>  

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
| [opts.terminator] | <code>string</code> &#124; <code>array</code> | <code>&quot;\&quot;\\n\&quot;&quot;</code> | the terminator to signal the end of a JSON object. If an array is given, the first element is a receive (buf2obj) terminator and the second is the transmit (obj2buf) element |

<a name="ObjectBuffer+buf2obj"></a>

### objectBuffer.buf2obj(buffer) ⇒ <code>Array</code>
buf2obj

Convert a Buffer into one or more objects

**Kind**: instance method of <code>[ObjectBuffer](#ObjectBuffer)</code>  
**Returns**: <code>Array</code> - found the objects we found  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> | the buffer to read (we may modify or store it!) |

<a name="ObjectBuffer+obj2buf"></a>

### objectBuffer.obj2buf(object, buffer)
obj2buf

Convert an Object to a Buffer

**Kind**: instance method of <code>[ObjectBuffer](#ObjectBuffer)</code>  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object</code> | the object to convert |
| buffer | <code>Buffer</code> | the buffer representing that object |


## License
MIT
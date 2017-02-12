# Sockhop
Extra cool sockets for node.js

## Example
```javascript

	// Client
	var c=new Sockhop.client();
	c.on("receive", (msg, metadata)=>{

		// We have data
	});

	// Server
	var s=new Sockhop.server();
	s
		.listen()
		.then(()=>{

			return c.connect();
		})
		.then(()=>{

			s.sendall("This goes to all clients");

		});


```

## Intro
Sockhop wraps node sockets and gives you:

- Easy control and events for things that can be tricky ("is my client still connected?")
- Easy passing of arbitrary objects, including type metadata so you can reconstitute them at the remote end
- Safe binary encoding of objects across streams
- Ping across connections


## Notes
Sockhop easily passes objects across the wire.  If you pack/transcode JS in a way that mutates class names, this functionality will be broken!  This includes autp ping functionality.

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

* [SockhopClient](#SockhopClient) ⇐ <code>EventEmitter</code>
    * [.socket](#SockhopClient+socket)
    * [.socket](#SockhopClient+socket) ⇒ <code>net.socket</code>
    * [.connect()](#SockhopClient+connect) ⇒ <code>Promise</code>
    * [.get_bound_address()](#SockhopClient+get_bound_address) ⇒ <code>string</code>
    * [.send(object)](#SockhopClient+send) ⇒ <code>Promise</code>
    * [.ping(delay)](#SockhopClient+ping)
    * [.disconnect()](#SockhopClient+disconnect) ⇒

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
<a name="SockhopClient+connect"></a>

### sockhopClient.connect() ⇒ <code>Promise</code>
Connect

Connect to the server

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
<a name="SockhopServer"></a>

## SockhopServer ⇐ <code>EventEmitter</code>
Wrapped TCP server

**Kind**: global class  
**Extends:** <code>EventEmitter</code>  

* [SockhopServer](#SockhopServer) ⇐ <code>EventEmitter</code>
    * [.sockets](#SockhopServer+sockets) ⇒ <code>array</code>
    * [.ping(delay)](#SockhopServer+ping)
    * [.listen()](#SockhopServer+listen) ⇒ <code>Promise</code>
    * [.get_bound_address()](#SockhopServer+get_bound_address) ⇒ <code>string</code>
    * [.send(socket, object)](#SockhopServer+send) ⇒ <code>Promise</code>
    * [.sendall(object)](#SockhopServer+sendall) ⇒ <code>Promise</code>
    * [.disconnect()](#SockhopServer+disconnect) ⇒ <code>Promise</code>
    * [.close()](#SockhopServer+close) ⇒

<a name="SockhopServer+sockets"></a>

### sockhopServer.sockets ⇒ <code>array</code>
Socket getter

**Kind**: instance property of <code>[SockhopServer](#SockhopServer)</code>  
**Returns**: <code>array</code> - the underlying socket objects for our clients  
<a name="SockhopServer+ping"></a>

### sockhopServer.ping(delay)
Ping

Ping all clients, detect timeouts

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

## License
MIT
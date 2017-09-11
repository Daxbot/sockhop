var Bluebird=require("bluebird");
var net=Bluebird.promisifyAll(require("net"));
var EventEmitter=require("events").EventEmitter;
var inherits = require("util").inherits;
var uuid=require("uuid");
var ObjectBuffer=require("./lib/ObjectBuffer.js");
/** 
 * TCP Ping
 *
 * Used internally when .ping() is called
 */
class SockhopPing {

	constructor(o={}){

		this._id=o._id||uuid();
		this._created=o._created||new Date();
		this._returned=o._returned||null;
		this._finished=o._finished||null;
	}

	/**
	 * Unanswered
	 *
	 * Is this ping Unanswered?
	 * @return {boolean}
	 */
	unanswered(){

		return (this._finished===null)?true:false;
	}

	/**
	 * Conclude a ping 
	 *
	 * Sets the returned, finished values
	 * @param {SockhopPong} pong the pong (ping reply) that is finishing this ping
	 */
	conclude_with_pong(p){

		if(p._id==this._id){

			this._returned=p._returned;
			this._finished=new Date();
			//console.log("finished: "+JSON.stringify(this));
		}
	}
}

/** 
 * TCP Ping reply
 *
 * Used internally when .ping() is replied
 */
class SockhopPong {

	constructor(o={}){

		this._id=o._id||null;
		this._created=o._created||null;
		this._returned=o._returned||new Date();
		this._finished=o._finished||null;
	}

	get finished(){
		
		return this._finished;
	}
}

/**
 * connect event
 *
 * @event SockhopClient#connect
 * @param {net.Socket} sock the socket that just connected
 */

/**
 * receive event
 *
 * We have successfully received an object from the server
 *
 * @event SockhopClient#receive
 * @param {object} object the received object
 * @param {object} meta metadata
 * @param {string} meta.type the received object constructor ("Object", "String", "Widget", etc)
 */

/**
 * disconnect event
 *
 * @event SockhopClient#disconnect
 * @param {net.Socket} sock the socket that just disconnected
 */



/** 
 * Wrapped TCP client
 * @fires SockhopClient#connect
 * @fires SockhopClient#disconnect
 * @fires SockhopClient#receive
 * @fires Error 
 * @extends EventEmitter
 */
class SockhopClient extends EventEmitter{

	/**
	 * Constructs a new SockhopClient
	 *
	 * @param {object} [opts] an object containing configuration options
	 * @param {string} [opts.address="127.0.0.1"] the IP address to bind to
	 * @param {number} [opts.port=50000] the TCP port to use
	 * @param {number} [opts.auto_reconnect_interval=2000] the auto reconnection interval, in ms.
	 * @param {string} opts.peer_type the type of client to expect.  Defaults to "Sockhop" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects
	 * @param {(string|array)} [opts.terminator="\n"] the JSON object delimiter.  Passed directly to the ObjectBuffer constructor.
	 * @param {boolean} [opts.allow_non_objects=false] allow non objects to be received and transmitted. Passed directly to the ObjectBuffer constructor.
	 */	

	 constructor(opts={}){

		super();
		var _self=this;
		this.pings=[];
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this._peer_type=(opts.peer_type!="json")?"Sockhop":"json";
		this.interval_timer=null;
		this._auto_reconnect=false; // Call setter please!  Was: (typeof(opts.auto_reconnect)=='boolean')?opts.auto_reconnect:false;
		this._auto_reconnect_interval=opts.auto_reconnect_interval||2000;	//ms
		this._auto_reconnect_timer=null;
		this._send_callbacks={};
		this._connected=false;
		this._connecting=false;
//		this.socket=new net.Socket();  // Uses setter, will be stored in this._socket

		// Create ObjectBuffer and pass along any errors
		this._objectbuffer=new ObjectBuffer({
				terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
				allow_non_objects: opts.allow_non_objects
			});
		this._objectbuffer.on("error",(e)=>{

			_self.emit("error", e);
		});
	}

	/**
	 * connected
	 *
	 * @return {boolean} connected whether or not we are currently connected
	 */
	get connected(){

		return this._connected;
	}

	/**
	 * auto_reconnect getter
	 *
	 * @return {boolean} auto_reconnect the current auto_reconnect setting
	 */
	get auto_reconnect(){

		return this._auto_reconnect;
	}

	/**
	 * auto_reconnect setter
	 *
	 * @param {boolean} auto_reconnect the desired auto_reconnect setting
	 */
	set auto_reconnect(b){

		// Save it
		this._auto_reconnect=b;

		if(this._auto_reconnect){

			// Make sure we are not already connecting
			if(this._socket && this._socket.connecting===true) return;

			// Begin auto connecting
			if(!this.connected) this._perform_auto_reconnect();			

		} else {

			// ..or else stop it
			if(this._auto_reconnect_timer) {

				clearTimeout(this._auto_reconnect_timer);
				_auto_reconnect_timer=null;
			}
		}
	}

	/**
	 * Perform an auto reconnet (internal)
	 *
	 * We have determined that an auto reconnect is necessary.
	 * We will initiate it, and manage the fallout.
	 */
	_perform_auto_reconnect(){


		// If we are already connected or connecting, we can disregard
		if(this._socket && this._socket.connecting) return;
		if(this.connected) return;

		// If auto reconnect has been disabled, we can disregard
		if(!this._auto_reconnect) return;

		// If we already have a reconnect timer running, disregard
		if(this._auto_reconnect_timer) return;

		var _self=this;
		this.connect()
			.catch((e)=>{

				// If we already have a reconnect timer running, disregard
				if(this._auto_reconnect_timer) return;

				// Reconnect failed.  We don't care why.  Try again
				_self._auto_reconnect_timer=setTimeout(()=>{

					// Signify that we have no timer (it just ended)
					_self._auto_reconnect_timer=null;

					// Call ourself
					_self._perform_auto_reconnect();

				}, _self._auto_reconnect_interval);
			});
	}

	/**
	 * End a socket
	 * 
	 * Emits 'disconnect' event, replaces the old socket with a new one
	 * @private
	 */
	_end_socket() {

		let _self=this;

		// Change state of _connected 
		let was_connected=_self._connected;
		_self._connected=false;

		// Emit 'disconnected' if we just transitioned state
		if(was_connected) _self.emit("disconnect", _self._socket);

		// Delete socket
		if(_self._socket) {

			_self._socket.destroy();
			_self._socket=null;
		}
//		_self.socket=new net.Socket();

		// Reconnect (should be safe even if auto_reconnect is false)
		this._perform_auto_reconnect();
	}

	/**
	 * Socket setter
	 *
	 * @param {net.socket} socket a new socket to set up
	 */
	set socket(s) {

		var _self=this;

		this._socket=s;
		this._socket
			.on("end",()=>this._end_socket())
			.on("data", (buf)=>{

				this._objectbuffer.buf2obj(buf).forEach((o)=>{

					// Handle SockhopPing requests with silent SockhopPong
					if(o.type=="SockhopPing"){

						var p=new SockhopPong(o.data);
						_self.send(p)
							.catch((e)=>{});	// Ignore any sending problems, there is nothing further we need to do
						return;
					}

					// Handle SockhopPong 
					if(o.type=="SockhopPong"){

						for(let p of _self.pings){

							p.conclude_with_pong(o.data);
						}
						return;
					}

					if(_self._peer_type=="Sockhop") {

						// Handle remote callback (callback activated)
						if(o.callback_id) {

							// Call the callback instead of bubbling the event
							this._send_callbacks[o.callback_id](o.data, {type:o.type});
							delete this._send_callbacks[o.callback_id];

						// Remote end is requesting callback
						} else if (o.id){

							_self.emit("receive", o.data, {type:o.type, callback: function(oo){ _self._trigger_remote_callback(o.id, oo);} });

						} else {

							_self.emit("receive", o.data, {type:o.type});		// Remote end sends type: "Widget", "Array", etc
						}


					} else {

						_self.emit("receive", o, {type: o.constructor.name });		// We read converted data directly, will be "String" or "Object"
					}

				});
			})
			.on("error",(e)=>{

//console.log(`we got error ${e}`);

				// If we are still connected but got an ECONNRESET, kill the connection.  
				if(_self._connected && e.toString().match(/ECONNRESET/)){

					_self._end_socket();

				// We got 'This socket is closed' but we are supposed to auto reconnect.  Handle quietly
				} else if(e.toString().match(/This socket is closed/) && _self.auto_reconnect===true) {

					_self._end_socket();

				// ECONNREFUSED but we are supposed to auto reconnect (or we are connecting, in which case connect() will reject and emitting an error would be superfluous) 
				} else if(e.toString().match(/ECONNREFUSED/) && (_self.auto_reconnect===true || _self._connecting)) {

					// Ignore 

				} else {  // Other

//					console.log(`emitting because _self.auto_reconnect=${_self.auto_reconnect}`);
					_self.emit("error",e);
				}

				// // If we are the only one listening for a socket error, bubble it up through the client
				// if(_self._socket.listenerCount("error")==1){

				// }
			});

	}

	/**
	 * Socket getter
	 *
	 * @return {net.socket} underlying socket object
	 */
	get socket (){

		return this._socket;
	}

	/**
	 * Connect
	 *
	 * Connect to the server
	 * If you want to quietly start an auto_reconnect sequence to an unavailable server, just set .auto_reconnect=true.  
	 * Calling this directly will get you a Promise rejection if you are not able to connect the first time.
	 * N.B.: The internals of net.socket add their own "connect" listener, so we can't rely on things like sock.removeAllListeners("connect") or sock.listenerCount("connect") here
	 *
	 * @return {Promise}
	 */
	connect(){

		let self=this;


		// If we are connected, we can return immediately
		if(this._connected) return Promise.resolve();

		// Only allow ourself to be called once per actual connect
		if(this._connecting) return Promise.reject(new Error("You have already called connect() once. Still trying to connect!"));

		return new Promise((resolve, reject)=>{

			self._connecting=true;

			// If we try to createConnection immediately something hangs under certain circumstances.  HACK
			setTimeout(()=>{

				self.socket=net.createConnection(self.port, self.address, ()=>{

					self._connecting=false;
					self._connected=true;
					self.emit("connect", self._socket);
					resolve();
				});



				// This socket is new and only has the error handlers that we created when we used the this.socket setter.  Add one more
				self.socket.once("error",(e)=>{

					if(self._socket && self._connecting===true && self._connected===false){

						self._connecting=false;
						reject(e);
					}
				});

			},0);


		});
	}


	/**
	 * Get bound address
	 *
	 * @return {string} the IP address we are bound to 
	 */
	get_bound_address(){

		return this._socket.address().address;
	}

	/**
	 * Trigger a remote callback
	 *
	 * Our side received a message with a callback, and we are now triggering that remote callback
	 *
	 * @private
	 * @param {string} id the id of the remote callback
	 * @param {object} o the object we want to send as part of our reply
	 * @throws Error
	 */
	_trigger_remote_callback(id, o) {

		let m={
			type	:	o.constructor.name,
			data	:	o,
			callback_id: id
		};

		if(this._socket.destroyed){

			this._socket.emit("end");
			throw new Error("Client unable to send() - socket has been destroyed");
		}

		this._socket.writeAsync(this._objectbuffer.obj2buf(m));
	}

	/**
	 * Send
	 *
	 * Send an object to the server
	 * @param {object} object to be sent over the wire
	 * @param {function} [rcallback] Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise
	 * @return {Promise} 
	 * @throws {Error}
	 */
	send(o, callback){


		// Create a message
		let m;
		if(this._peer_type=="Sockhop") {

			m={
				"type"	:	o.constructor.name,
				data	:	o
			};

		} else {

			m=o;
			if(callback) throw new Error("Unable to use remote callback - peer type must be Sockhop");
		}	

		if(this._socket.destroyed){

			this._socket.emit("end");
			return Promise.reject(new Error("Client unable to send() - socket has been destroyed"));
		}

		// Handle remote callback setup
		if(callback) {

			if (typeof(callback)!= 'function') throw new Error("remote_callback must be a function");

			// A reply is expected. Tag the message so we will recognize it when we get it back
			m.id=uuid();
			this._send_callbacks[m.id]=callback;
		}

		return this._socket.writeAsync(this._objectbuffer.obj2buf(m));
	}	

	/** 
	 * Ping
	 * 
	 * Send ping, detect timeouts.  If we have 4 timeouts in a row, we kill the connection and emit a 'disconnect' event.
	 * You can then call .connect() again to reconnect.  
	 * @param {number} delay in ms (0 disables ping)
	 */
	 ping(delay=0){

	 	let _self=this;

	 	// Remove any old timers
 		if(this.intervaltimer){
 			clearInterval(this.interval_timer);
 			this.interval_timer=null;
 		}

 		// Clear old pings
 		this.pings=[];

	 	// Set up new timer
	 	if(delay!==0){

		 	// Set up a new ping timer
		 	this.interval_timer=setInterval(()=>{

		 		// Only proceed if we are connected
		 		if(!_self._connected) return;

		 		// Send a new ping on each timer
		 		var p = new SockhopPing();

	 			// Save new ping
	 			_self.pings.push(p);

	 			// Delete old pings
	 			while(_self.pings.length>4) _self.pings.shift();

	 			// If all (but at least 4) pings are unanswered, take action!
	 			let unanswered=_self.pings.reduce((a,v)=>a+(v.unanswered()?1:0),0);
	 			if(_self.pings.length>3 && _self.pings.length==unanswered){

	 				// Destroy socket, emit 'disconnect' event, mark ourself as disconnected
	 				_self.pings=[];
		 			_self._end_socket();
	 				return;
	 			}

	 			// If we get this far, send the ping.  
		 		_self.send(p).catch((e)=>{

		 			// Even if it fails, we are remembering that we sent it and will disconnect after enough failures
		 		});

		 	}, delay);
		 }
	 }



	/**
	 * disconnect
	 *
	 * Disconnect the socket (send FIN)
	 * @return Promise
	 */
	disconnect(){

		// Disable auto reconnect (else we will just connect again)
		this._auto_reconnect=false;
		this._socket.end();
		this._socket.destroy();

		// Old socket is dead
		this._end_socket();
		return Promise.resolve();
	}
}


/**
 * connect event
 *
 * @event SockhopServer#connect
 * @param {net.Socket} sock the socket that just connected
 */

/**
 * receive event
 *
 * We have successfully received an object from the client
 *
 * @event SockhopServer#receive
 * @param {object} object the received object
 * @param {object} meta metadata
 * @param {string} meta.type the received object constructor ("Object", "String", "Widget", etc)
 * @param {net.Socket} meta.socket the socket that sent us this object
 * @param {function} [meta.callback] the callback function, if the client is requesting a callback. Pass an object you want returned to the client
 */

/**
 * disconnect event
 *
 * @event SockhopServer#disconnect
 * @param {net.Socket} sock the socket that just disconnected
 */


/** 
 * Wrapped TCP server
 *
 * When data is received by the server, the received Buffer is concatenated with previously
 * received Buffers until a delimiter (usually "\n") is received.  The composite Buffer is then treated
 * like a JSON string and converted to an object, which is triggers a "receive" event.
 * If the client is a SockhopClient, it will further wrap sent data in metadata that describes the type - 
 * this allows you to pass custom objects (prototypes) across the wire, and the other end will know
 * it has received your Widget, or Foo, or whatever.  Plain objects, strings, etc. are also similarly labelled.
 * The resulting receive event has a "meta" parameter; meta.type will list the object type.
 *
 * Of course, if your client is not a SockhopClient, you don't want this wrapping/unwrapping behavior
 * and you might want a different delimiter for JSON.  Both these parameters are configurable in the 
 * constructor options.
 *
 * @extends EventEmitter
 * @fires SockhopServer#connect
 * @fires SockhopServer#disconnect
 * @fires SockhopServer#receive
 * @fires Error
 */
class SockhopServer extends EventEmitter {


	/**
	 * Constructs a new SockhopServer
	 *
	 * @param {object} [opts] an object containing configuration options
	 * @param {string} [opts.address="127.0.0.1"] the IP address to bind to
	 * @param {number} [opts.port=50000] the TCP port to use
	 * @param {number} [opts.auto_reconnect_interval=2000] the auto reconnection interval, in ms.
	 * @param {(string|array)} [opts.terminator="\n"] the JSON object delimiter.  Passed directly to the ObjectBuffer constructor.
	 * @param {boolean} [opts.allow_non_objects=false] allow non objects to be received and transmitted. Passed directly to the ObjectBuffer constructor.
	 * @param {string} opts.peer_type the type of client to expect.  Defaults to "SockhopClient" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects
	 */
	constructor(opts={}){

		super();
		var _self=this;
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this._peer_type=(opts.peer_type!="json")?"Sockhop":"json";
		this._sockets=[];
		this._send_callbacks={};
		this.pings=new Map();
		this.server=net.createServer();
		this.interval_timer=null;

		// Create ObjectBuffer and pass along any errors
		this._objectbuffer=new ObjectBuffer({
				terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
				allow_non_objects: opts.allow_non_objects
			});
		this._objectbuffer.on("error",(e)=>{

			_self.emit("error", e);
		});

		// Setup server
		this.server.on('connection', function(sock){

			// Setup empty pings map
			_self.pings.set(sock,[]);

			// Emit event
			_self.emit("connect", sock);

			// Setup the socket events
			sock
				.on("end",()=>{

					_self.emit("disconnect", sock);
					_self._sockets.splice(_self._sockets.indexOf(sock), 1);
					_self.pings.delete(sock);
				})
				.on('data',function(buf){

					_self._objectbuffer.buf2obj(buf).forEach((o)=>{

						// Handle SockhopPing requests with SockhopPong
						if(o.type=="SockhopPing"){

							var p=new SockhopPong(o.data);
							_self.send(sock,p);
							return;
						}

						// Handle SockhopPong 
						if(o.type=="SockhopPong"){

							var pings=_self.pings.get(sock);
							for(let p of pings){

								p.conclude_with_pong(o.data);
							}
							return;
						}

						if(_self._peer_type=="Sockhop") {
	
							// Handle remote callback (callback activated)
							if(o.callback_id) {

								// Call the callback instead of bubbling the event
								_self._send_callbacks[o.callback_id](o.data, {type:o.type});
								delete _self._send_callbacks[o.callback_id];

							// Remote end is requesting callback
							} else if (o.id){

								_self.emit("receive", o.data, {type:o.type, socket: sock, callback: function(oo={}){ _self._trigger_remote_callback(sock, o.id, oo);} });

							} else {

								_self.emit("receive", o.data, {type:o.type, socket: sock });		// Remote end sends type: "Widget", "Array", etc
							}

						} else {

							_self.emit("receive", o, {type:o.constructor.name, socket: sock });		// We read converted data directly, will be "String" or "Object"
						}
					});	

				})
				.on("error",(e)=>{

						// Bubble socket errors
						_self.emit("error",e);
				});
			_self._sockets.push(sock);
		});
	}

	/**
	 * Socket getter
	 *
	 * @return {array} the underlying socket objects for our clients
	 */
	 get sockets(){

	 	return this._sockets;
	 }

	/** 
	 * Ping
	 * 
	 * Ping all clients, detect timeouts. Only works if connected to a SockhopClient.
	 * @param {number} delay in ms (0 disables ping)
	 */
	 ping(delay=0){

	 	// Remove any old timers
 		if(this.intervaltimer){
 			clearInterval(this.interval_timer);
 			this.interval_timer=null;
 		}


	 	// Set up new timer
	 	if(delay!==0){

		 	// Set up a new ping timer
		 	this.interval_timer=setInterval(()=>{

		 		// Send a new ping on each timer
		 		var p = new SockhopPing();
		 		for(let s of this._sockets){

		 			// Save new ping
		 			let pings=this.pings.get(s);
		 			pings.push(p);

		 			// Delete old pings
		 			while(pings.length>4) pings.shift();

		 			let unanswered=pings.reduce((a,v)=>a+(v.unanswered()?1:0),0);
		 			if(pings.length>3 && pings.length==unanswered){

		 				s.end();
		 				s.destroy();
		 				s.emit("end");
		 			}
		 		}
		 		this.sendall(p);

		 	}, delay);
		 }
	 }

	/**
	 * Listen
	 * 
	 * Bind and wait for incoming connections
	 * @return {Promise}
	 */
	listen(){

		return this.server.listenAsync(this.port, this.address);
	}

	/**
	 * Get bound address
	 *
	 * @return {string} the IP address we are bound to 
	 */
	get_bound_address(){

		return this.server.address().address;
	}

	/**
	 * Trigger a remote callback
	 *
	 * Our side received a message with a callback, and we are now triggering that remote callback
	 *
	 * @private
	 * @param {net.socket} socket on which to send it
	 * @param {string} id the id of the remote callback
	 * @param {object} o the object we want to send as part of our reply
	 * @throws Error
	 */
	_trigger_remote_callback(sock, id, o) {

		let m={
			type	:	o.constructor.name,
			data	:	o,
			callback_id: id
		};

		if(sock.destroyed){

			sock.emit("end");
			throw new Error("Client unable to send() - socket has been destroyed");
		}

		sock.writeAsync(this._objectbuffer.obj2buf(m));
	}

	/** 
	 * Send
	 *
	 * Send an object to one clients
	 * @param {net.socket} socket on which to send it
	 * @param {object} object that we want to send
	 * @param {function} [callback] Callback when remote side calls meta.done (see receive event) - this is basically a remote Promise
	 * @throw Error
	 * @return {Promise}
	 */
	send(sock,o, callback){

		let _self=this;

		// Sanity checks
		if(!sock || !o || typeof(o)=="undefined") throw new Error("SockhopServer send() requires a socket and data");

		// Create a message
		var m;
		if(_self._peer_type=="Sockhop") {

			m={
				"type"	:	o.constructor.name,
				data	:	o
			};

		} else {

			m=o;
			if(callback) throw new Error("Unable to use remote callback - peer type must be Sockhop");
		}	

		if(sock.destroyed){

			sock.emit("end");
			return Promise.reject(new Error("Socket was destroyed"));

		} 

		// Handle remote callback setup
		if(callback) {

			if (typeof(callback)!= 'function') throw new Error("remote_callback must be a function");

			// A reply is expected. Tag the message so we will recognize it when we get it back
			m.id=uuid();
			this._send_callbacks[m.id]=callback;
		}

		return sock.writeAsync(this._objectbuffer.obj2buf(m));
		
	}


	/** 
	 * Sendall
	 *
	 * Send an object to all clients
	 * @param {object} object to send to all connected clients
	 * @return {Promise}
	 */
	sendall(o){

		let _self=this;

		// Check each socket in case it was destroyed (unclean death).  Remove bad.  Send data to good.
		return Promise.all(this._sockets.map((s)=>{if(s.destroyed) s.emit("end"); else return this.send(s,o);}));
	}

	/**
	 * Disconnect
	 *
	 * Disconnect all clients
	 * Does not close the server - use close() for that 
	 * @return {Promise}
	 */
	 disconnect(){

	 	this.ping(0);	// Stop all pinging
		return Promise.all(this._sockets.map((s)=>s.endAsync()));	 	
	 }	

	 /**
	  * Close
	  *
	  * Disconnects any clients and closes the server
	  * @return Promise
	  */
	  close(){

	  	return Promise.all([this.disconnect(), this.server.closeAsync()])
	  			.then(()=>{

	  				// Replace the server object (may not be necessary, but seems cleaner)
					this.server=net.createServer();
					return Promise.resolve();
	  			})
	  			.catch((e)=>{

	  				// Ignore "not running" (means we just shut down the server quickly)
	  				if(e.toString().match(/not running/)){

						this.server=net.createServer();
						return Promise.resolve();
	  				}
	  			});

	  }

}



module.exports=exports={

	"server"	:	SockhopServer,
	"client"	:	SockhopClient
};
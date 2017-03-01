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
 * Wrapped TCP client
 * @extends EventEmitter
 */
class SockhopClient extends EventEmitter{

	constructor(opts={}){

		super();
		var _self=this;
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this.interval_timer=null;
		this._auto_reconnect=false; // Call setter please!  Was: (typeof(opts.auto_reconnect)=='boolean')?opts.auto_reconnect:false;
		this._auto_reconnect_interval=opts.auto_reconnect_interval||2000;	//ms
		this._auto_reconnect_timer=null;
		this._connected=false;
		this._connecting=false;
		this.socket=new net.Socket();  // Uses setter, will be stored in this._socket

		// Create ObjectBuffer and pass along any errors
		this._objectbuffer=new ObjectBuffer({terminator: opts.terminator||"\n"});
		this._objectbuffer.on("error",(e)=>{throw e;});
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

		this._auto_reconnect=b;
		if(this._auto_reconnect && !this.connected && !this._socket.connecting) this._perform_auto_reconnect();
	}

	/**
	 * Perform an auto reconnet (internal)
	 *
	 * We have determined that an auto reconnect is necessary.
	 * We will initiate it, and manage the fallout.
	 */
	_perform_auto_reconnect(){

		// If we are already connected or connecting, we can disregard
		if(this.connected || this._socket.connecting) return;

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
	 * Socket setter
	 *
	 * @param {net.socket} socket a new socket to set up
	 */
	set socket(s) {

		var _self=this;
		this.pings=[];
		this._socket=s;
		this._socket
			.on("end",()=>{

				// Stop pinging change state of _connected 
				let was_connected=_self._connected;
				_self._connected=false;
				_self.ping(0);

				// Emit 'disconnected' if we just transitioned state
				if(was_connected) _self.emit("disconnect", _self._socket);

				// Create a new socket.  Let everything be clean again!
				_self.socket=new net.Socket();

				// If we are set to auto reconnect, fire that in 100ms (without the delay, we seem to be connect()ing on the old socket, which
				// causes us to get a connect event and then an immediate disconnect event)
				if(_self._auto_reconnect) {

					setTimeout(()=>{
						_self._perform_auto_reconnect();

					}, 100);
				}
			})
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

					_self.emit("receive", o.data,{type:o.type});

				});
			})
			.on("error",(e)=>{

				// If we are still connected but got an ECONNRESET, kill the connection.  This will also trigger "end" on the socket
				if(_self._connected && e.toString().match(/ECONNRESET/)){

					_self.disconnect();
				} 

				// If we are the only one listening for a socket error, bubble it up through the client
				if(_self._socket.listenerCount("error")==1){

					_self.emit("error",e);
				}
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

		var self=this;
		var sock=this._socket;

		// If we are connected, we can return immediately
		if(this._connected) return Promise.resolve();

		// Only allow ourself to be called once per actual connect
		if(this._connecting) return Promise.reject(new Error("You have already called connect() once. Still trying to connect!"));

		return new Promise((resolve, reject)=>{


			// Create two event handlers.  We don't want (e.g.) our 'reject' function called whenever the socket throws an error.
			let on_error, on_connect, remove_both_listeners;

			on_error=(e)=>{
				self._connecting=false;
				remove_both_listeners();
				// sock.removeAllListeners("connect");
				reject(e);
			};

			on_connect=()=>{

				self._connecting=false;
				self._connected=true;
				remove_both_listeners();
				// sock.removeAllListeners("connect");
				self.emit("connect", sock);
				resolve();
			};

			remove_both_listeners=()=>{

				sock.removeListener("error", on_error);
				sock.removeListener("connect", on_connect);
			};

			// Connect the listeners
			sock.on("error", on_error);
			sock.on("connect", on_connect);

			self._connecting=true;
			sock.connect(this.port, this.address);

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
	 * Send
	 *
	 * Send an object to the server
	 * @param {object} object to be sent over the wire
	 * @return {Promise} 
	 */
	send(o){


		// Create a message
		var m={
			"type"	:	o.constructor.name,
			data	:	o
		};		

		if(this._socket.destroyed){

			this._socket.emit("end");
			return Promise.reject(new Error("Client unable to send() - socket has been destroyed"));
		}

		return this._socket.writeAsync(this._objectbuffer.obj2buf(m));
	}	

	/** 
	 * Ping
	 * 
	 * Send ping, detect timeouts.  If we have 4 timeouts in a row, we stop pinging, kill the connection and emit a 'disconnect' event.
	 * You can then call .connect() again to reconnect.  Don't forget to re-enable pings.
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

	 			// Save new ping
	 			this.pings.push(p);

	 			// Delete old pings
	 			while(this.pings.length>4) this.pings.shift();

	 			let unanswered=this.pings.reduce((a,v)=>a+(v.unanswered()?1:0),0);
	 			if(this.pings.length>3 && this.pings.length==unanswered){

	 				// Kill timer
		 			this.ping(0);

		 			// Shutdown the socket
	 				this._socket.end();
	 				this._socket.destroy();

	 				// Old socket is dead
					this._socket.emit("end");

	 				return;
	 			}
	 			var _self=this;
		 		this.send(p).catch((e)=>{

		 			_self.ping(0);	// Socket has already been shut down etc
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
		this._socket.emit("end");
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
 * data event
 *
 * We have successfully received an object from the client
 *
 * @event SockhopServer#data
 * @param {object} object the received object
 * @param {object} meta metadata
 * @param {string} meta.type the received object type ("object", "string", etc. or prototype name - e.g. "Widget")
 * @param {net.Socket} meta.socket the socket that sent us this object
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
 * @fires SockhopServer#data
 * @fires Error
 */
class SockhopServer extends EventEmitter {

	/**
	 * new()
	 *
	 * Constructs a new SockhopServer
	 *
	 * @param {object} opts an object containing optional configuration options
	 * @param {string} opts.address the IP address to bind to, defaults to "127.0.0.1"
	 * @param {number} opts.port the TCP port to use, defaults to 50000
	 * @param {string} opts.client_type the type of client to expect.  Defaults to "SockhopClient" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects
	 * @param {string} opts.terminator the JSON object delimiter.  Defaults to "\n"
	 */

	constructor(opts={}){

		super();
		var _self=this;
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this._client_type=(opts.client_type!="json")?"SockhopClient":"json";
		this._sockets=[];
		this.pings=new Map();
		this.server=net.createServer();
		this.interval_timer=null;

		// Create ObjectBuffer and pass along any errors
		this._objectbuffer=new ObjectBuffer({terminator: opts.terminator||"\n"});
		this._objectbuffer.on("error",(e)=>{throw e;});

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

						if(this._client_type=="SockhopClient") {
	
							_self.emit("receive", o.data, {type:o.type, socket: sock });

						} else {

							_self.emit("receive", o, {type:"object", socket: sock });
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
	 * Ping all clients, detect timeouts
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
	 * Send
	 *
	 * Send an object to one clients
	 * @param {net.socket} socket on which to send it
	 * @param {object} object that we want to send
	 * @throw Error
	 * @return {Promise}
	 */
	send(sock,o){

		let _self=this;

		// Sanity checks
		if(!sock || !o || typeof(o)=="undefined") throw new Error("SockhopServer send() requires a socket and data");

		// Create a message
		var m={
			"type"	:	o.constructor.name,
			data	:	o
		};		

		if(sock.destroyed){

			sock.emit("end");
			return Promise.reject(new Error("Socket was destroyed"));

		} else {

			return sock.writeAsync(this._objectbuffer.obj2buf(m));
		}
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
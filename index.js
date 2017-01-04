"use strict";
var Promise=require("bluebird");
var net=Promise.promisifyAll(require("net"));
var EventEmitter=require("events").EventEmitter;
var inherits = require("util").inherits;
var uuid=require("uuid");


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
	 * @return boolean
	 */
	unanswered(){

		return (this._finished==null)?true:false;
	}

	/**
	 * Conclude a ping 
	 *
	 * Sets the returned, finished values
	 * @param SockhopPong
	 * @return
	 */
	conclude_with_pong(p){

		if(p._id==this._id){

			this._returned=p._returned;
			this._finished=new Date();
			//console.log("finished: "+JSON.stringify(this));
		}
	}
}

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


class SockhopClient extends EventEmitter{

	constructor(opts={}){

		super();
		var _self=this;
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this.interval_timer=null;
		this.socket=new net.Socket();
	}

	/**
	 * Socket setter
	 *
	 * @param a new socket to set up
	 */
	set socket(s) {

		var _self=this;
		this.pings=[];
		this._socket=s;
		this._socket
			.on("end",()=>{

				// Stop pinging, emit disconnect
				_self.ping(0);
				_self.emit("disconnect", _self._socket);
			})
			.on("data", (data)=>{

				var o=JSON.parse(data);

				// Handle SockhopPing requests with silent SockhopPong
				if(o.type=="SockhopPing"){

					var p=new SockhopPong(o.data);
					_self.send(p);
					return;
				}

				// Handle SockhopPong 
				if(o.type=="SockhopPong"){

					for(let p of _self.pings){

						p.conclude_with_pong(o.data);
					}
					return;
				}

				this.emit("receive", o.data,{type:o.type});
			});

	}

	/**
	 * Socket getter
	 *
	 * @return underlying socket object
	 */
	get socket (){

		return this._socket;
	}

	/**
	 * Connect
	 *
	 * Connect to the server
	 * @return Promise
	 */
	connect(){

		var _self=this;
		return this._socket.connectAsync(this.port,this.address).then(()=>{

			_self.emit("connect", _self._socket);
			return Promise.resolve(_self._socket);			
		});	
	}


	/**
	 * Get bound address
	 *
	 * @return string the IP address we are bound to 
	 */
	get_bound_address(){

		return this._socket.address().address;
	}

	/**
	 * Send
	 *
	 * Send an object to the server
	 * @param object to send
	 * @return Promise, which will have a false value if unsuccessful
	 */
	send(o){


		// Create a message
		var m=JSON.stringify({
			"type"	:	o.constructor.name,
			data	:	o
		});		

		return (this._socket.destroyed)?Promise.resolve(false):this._socket.writeAsync(m);	
	}	

	/** 
	 * Ping
	 * 
	 * Send ping, detect timeouts.  If we have 4 timeouts in a row, we stop pinging, kill the connection and emit a 'disconnect' event.
	 * You can then call .connect() again to reconnect.  Don't forget to re-enable pings.
	 * @param delay ms (0 disables ping)
	 * @return
	 */
	 ping(delay=0){

	 	// Remove any old timers
 		if(this.intervaltimer){
 			clearInterval(this.interval_timer);
 			this.interval_timer=null;
 		}

	 	// Set up new timer
	 	if(delay!=0){

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
		 			clearInterval(this.interval_timer);
		 			this.interval_timer=null;

	 				this._socket.end();
	 				this._socket.destroy();
	 				this._socket.emit("end");

	 				this.socket=new net.Socket();
	 				return;
	 			}
		 		this.send(p);

		 	}, delay);
		 }
	 }



	/**
	 * disconnect
	 *
	 * @return
	 */
	disconnect(){

		this.socket.end();
	}
}





class SockhopServer extends EventEmitter {

	constructor(opts={}){

		super();
		var _self=this;
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this._sockets=[];
		this.pings=new Map();
		this.server=net.createServer();
		this.interval_timer=null;
		this.server.on('connection', function(sock){

			// Setup empty pings map
			_self.pings.set(sock,[]);

			// Emit event
			_self.emit("connect", sock);

			// Setup the socket events
			sock
				.setEncoding('utf8')
				.on("end",()=>{

					_self.emit("disconnect", sock);
					_self._sockets.splice(_self._sockets.indexOf(sock), 1);
					_self.pings.delete(sock);
				})
				.on('data',function(data){
					
					var o=JSON.parse(data);
	
					// Handle SockhopPing requests with SockhopPong
					if(o.type=="SockhopPing"){

						var p=new SockhopPong(o.data);
						_self.send(p);
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

					_self.emit("receive", o.data, {type:o.type, socket: sock });

				});

			_self._sockets.push(sock);
		});
	}

	/**
	 * Socket getter
	 *
	 * @return array of underlying socket objects
	 */
	 get sockets(){

	 	return this._sockets;
	 }

	/** 
	 * Ping
	 * 
	 * Ping all clients, detect timeouts
	 * @param delay ms (0 disables ping)
	 * @return
	 */
	 ping(delay=0){

	 	// Remove any old timers
 		if(this.intervaltimer){
 			clearInterval(this.interval_timer);
 			this.interval_timer=null;
 		}


	 	// Set up new timer
	 	if(delay!=0){

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
	 * @return Promise
	 */
	listen(){

		return this.server.listenAsync(this.port, this.address);
	}

	/**
	 * Get bound address
	 *
	 * @return string the IP address we are bound to 
	 */
	get_bound_address(){

		return this.server.address().address;
	}

	/** 
	 * Sendall
	 *
	 * Send an object to all clients
	 * @param object to send
	 * @return Promise
	 */
	sendall(o){

		let _self=this;

		// Create a message
		var m=JSON.stringify({
			"type"	:	o.constructor.name,
			data	:	o
		});		

		// Check each socket in case it was destroyed (unclean death).  Remove bad.  Send data to good.
		return Promise.all(this._sockets.map((s)=>{if(s.destroyed) s.emit("end"); else return s.writeAsync(m)}));

	}

	/**
	 * Disconnect
	 *
	 * Disconnect all clients
	 * Does not close the server - use close() for that
	 * @return Promise
	 */
	 disconnect(){

		return Promise.all(this._sockets.map((s)=>s.end()));	 	
	 }	

}



module.exports=exports={

	"server"	:	SockhopServer,
	"client"	:	SockhopClient
};
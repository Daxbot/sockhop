const Bluebird=require("bluebird");
const net = Bluebird.promisifyAll(require("net"));
const { EventEmitter } = require("events");
const { v4 : uuidv4 } = require("uuid");

const ObjectBuffer = require("./ObjectBuffer.js");
const { SockhopPing, SockhopPong } = require("./SockhopPing.js");


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
      * @param {string} [opts.path] the path for a Unix domain socket.  If used, this will override the address and port values.
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
        this.path=opts.path||null;
        this.port=opts.port||50000;
        this._peer_type=(opts.peer_type!="json")?"Sockhop":"json";
        this._sockets=[];
        this._objectbuffers=[];    // One per socket, using corresponding indices
        this._encoding_objectbuffer=new ObjectBuffer({
                    terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
                    allow_non_objects: opts.allow_non_objects
                });
        this._send_callbacks={};
        this.pings=new Map();
        this.server=net.createServer();
        this.interval_timer=null;


        // Setup server
        this.server.on('connection', function(sock){

            // Setup ObjectBuffer
            let objectbuffer=new ObjectBuffer({
                    terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
                    allow_non_objects: opts.allow_non_objects
                });
            objectbuffer.on("error",(e)=>{

                _self.emit("error", e);    // Should we pass along a reference to sock?
            });

            // Save the socket and objectbuffer in corresponding indices
            _self._sockets.push(sock);
            _self._objectbuffers[_self._sockets.indexOf(sock)]=objectbuffer;

            // Setup empty pings map
            _self.pings.set(sock,[]);

            // Emit event
            _self.emit_async("connect", sock);

            // Setup the socket events
            sock
                .on("end",()=>{

                    // Emit event
                    _self.emit_async("disconnect", sock);

                    // Remove the socket and objectbuffer
                    let index=_self._sockets.indexOf(sock);
                    _self._sockets.splice(index, 1);
                    _self._objectbuffers.splice(index, 1);

                    _self.pings.delete(sock);
                })
                .on('data',function(buf){

                    objectbuffer.buf2obj(buf).forEach((o)=>{

                        // Handle SockhopPing requests with SockhopPong
                        if(o.type=="SockhopPing"){

                            var p=new SockhopPong(o.data);
                            _self.send(sock,p).catch(()=>{});    // We don't care about errors here
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

                                _self.emit("receive", o.data, {type:o.type, socket: sock });        // Remote end sends type: "Widget", "Array", etc
                            }

                        } else {

                            _self.emit("receive", o, {type:o.constructor.name, socket: sock });        // We read converted data directly, will be "String" or "Object"
                        }
                    });

                })
                .on("error",(e)=>{

                        // Bubble socket errors
                        _self.emit("error",e);
                });
            })
            .on("error",(e)=>{

                    // Bubble server errors
                    _self.emit("error",e);
            });
    //        });
    }

    /**
     * Emit async
     *
     * We end up with odd event loops sometimes, e.g. if an on("disconnect") calls .sendall(), another "disconnect" will be emitted.
     * This functon emits evens asynchronously and breaks the chain
     * //HACK  -- THIS IS A HACKY FIX -- //HACK
     */
    emit_async() {

        let self=this;
        let _arguments=arguments;
        setTimeout(function(){ self.emit.apply(self,_arguments); },0);
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
         if(this.interval_timer!==null){
 
             clearInterval(this.interval_timer);
             this.interval_timer=null;
         }


         // Set up new timer
         if(delay!==0){

             // Set up a new ping timer
             this.interval_timer=setInterval(()=>{

                 // Send a new ping on each timer
                 for(let s of this._sockets){

                    let p = new SockhopPing();
                    this.send(s, p);

                     // Save new ping
                     let pings=this.pings.get(s);

                    if (!pings)
                        continue;

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

         return this.path?this.server.listenAsync(this.path):this.server.listenAsync(this.port, this.address);
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
            type    :    o.constructor.name,
            data    :    o,
            callback_id: id
        };

        if(sock.destroyed){

            sock.emit("end");
            throw new Error("Client unable to send() - socket has been destroyed");
        }

        sock.writeAsync(this._encoding_objectbuffer.obj2buf(m));
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
                "type"    :    o.constructor.name,
                data    :    o
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
            m.id=uuidv4();
            this._send_callbacks[m.id]=callback;
        }

        return sock.writeAsync(this._encoding_objectbuffer.obj2buf(m));


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

         this.ping(0);    // Stop all pinging
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


module.exports = exports = SockhopServer;

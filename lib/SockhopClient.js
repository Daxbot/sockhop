const Bluebird=require("bluebird");
const net = Bluebird.promisifyAll(require("net"));
const tls = Bluebird.promisifyAll(require("tls"));
const { EventEmitter } = require("events");
const { v4 : uuidv4 } = require("uuid");

const ObjectBuffer = require("./ObjectBuffer.js");
const { SockhopPing, SockhopPong } = require("./SockhopPing.js");


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
      * @param {string} [opts.path] the path for a Unix domain socket.  If used, this will override the address and port values.
     * @param {string} [opts.address="127.0.0.1"] the IP address to bind to
     * @param {number} [opts.port=50000] the TCP port to use
     * @param {boolean} [opts.ssl=false] use tls
     * @param {number} [opts.auto_reconnect_interval=2000] the auto reconnection interval, in ms.
     * @param {string} opts.peer_type the type of client to expect.  Defaults to "Sockhop" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects
     * @param {(string|array)} [opts.terminator="\n"] the JSON object delimiter.  Passed directly to the ObjectBuffer constructor.
     * @param {boolean} [opts.allow_non_objects=false] allow non objects to be received and transmitted. Passed directly to the ObjectBuffer constructor.
     */

    constructor(opts={}){

        super();
        this.pings=[];
        this.path=opts.path||null;
        this.address=opts.address||"127.0.0.1";
        this.port=opts.port||50000;
        this._peer_type=(opts.peer_type!="json")?"Sockhop":"json";
        this.interval_timer=null;
        this._auto_reconnect=false; // Call setter please!  Was: (typeof(opts.auto_reconnect)=='boolean')?opts.auto_reconnect:false;
        this._auto_reconnect_interval=opts.auto_reconnect_interval||2000;    //ms
        this._auto_reconnect_timer=null;
        this._send_callbacks={};
        this._connected=false;
        this._connecting=false;
        //        this.socket=new net.Socket();  // Uses setter, will be stored in this._socket

        // Create ObjectBuffer and pass along any errors
        this._objectbuffer=new ObjectBuffer({
            terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
            allow_non_objects: opts.allow_non_objects
        });
        this._objectbuffer.on("error",(e)=>{

            this.emit("error", e);
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
            if(this._auto_reconnect_timer!==null) {

                clearTimeout(this._auto_reconnect_timer);
                this._auto_reconnect_timer=null;
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

        this.connect()
            .catch(()=>{

                // If we already have a reconnect timer running, disregard
                if(this._auto_reconnect_timer) return;

                // Reconnect failed.  We don't care why.  Try again
                this._auto_reconnect_timer=setTimeout(()=>{

                    // Signify that we have no timer (it just ended)
                    this._auto_reconnect_timer=null;

                    // Call ourthis
                    this._perform_auto_reconnect();

                }, this._auto_reconnect_interval);
            });
    }

    /**
     * End a socket
     *
     * Emits 'disconnect' event, replaces the old socket with a new one
     * @private
     */
    _end_socket() {


        // Change state of _connected
        let was_connected=this._connected;
        this._connected=false;

        // Emit 'disconnected' if we just transitioned state
        if(was_connected) this.emit("disconnect", this._socket);

        // Delete socket
        if(this._socket) {

            this._socket.destroy();
            this._socket=null;
        }

        // Clear any pending pings
        this.pings=[];

        // Reconnect (should be safe even if auto_reconnect is false)
        this._perform_auto_reconnect();
    }



    /**
     * Socket setter
     *
     * @param {net.socket} socket a new socket to set up
     */
    set socket(s) {

        this._socket=s;
        this._socket
            .on("end",()=>this._end_socket())
            .on("data", (buf)=>{

                this._objectbuffer.buf2obj(buf).forEach((o)=>{

                    // Handle SockhopPing requests with silent SockhopPong
                    if(o.type=="SockhopPing"){

                        let p=new SockhopPong(o.data);
                        this.send(p)
                            .catch(()=>{});    // Ignore any sending problems, there is nothing further we need to do
                        return;
                    }

                    // Handle SockhopPong
                    if(o.type=="SockhopPong"){

                        for(let p of this.pings){

                            p.conclude_with_pong(o.data);
                        }
                        return;
                    }

                    if(this._peer_type=="Sockhop") {

                        // Handle remote callback (callback activated)
                        if(o.callback_id) {

                            // Call the callback instead of bubbling the event
                            this._send_callbacks[o.callback_id](o.data, {type:o.type});
                            delete this._send_callbacks[o.callback_id];

                        // Remote end is requesting callback
                        } else if (o.id){

                            this.emit("receive", o.data, {type:o.type, callback: (oo)=>{ this._trigger_remote_callback(o.id, oo);} });

                        } else {

                            this.emit("receive", o.data, {type:o.type});        // Remote end sends type: "Widget", "Array", etc
                        }


                    } else {

                        this.emit("receive", o, {type: o.constructor.name });        // We read converted data directly, will be "String" or "Object"
                    }

                });
            })
            .on("error",(e)=>{

                //console.log(`we got error ${e}`);

                // If we are still connected but got an ECONNRESET, kill the connection.
                if(this._connected && e.toString().match(/ECONNRESET/)){

                    this._end_socket();

                // We got 'This socket is closed' but we are supposed to auto reconnect.  Handle quietly
                } else if(e.toString().match(/This socket is closed/) && this.auto_reconnect===true) {

                    this._end_socket();

                // ECONNREFUSED but we are supposed to auto reconnect (or we are connecting, in which case connect() will reject and emitting an error would be superfluous)
                } else if(e.toString().match(/ECONNREFUSED/) && (this.auto_reconnect===true || this._connecting)) {

                    // Ignore

                } else {  // Other

                    //                    console.log(`emitting because this.auto_reconnect=${this.auto_reconnect}`);
                    this.emit("error",e);
                }

                // // If we are the only one listening for a socket error, bubble it up through the client
                // if(this._socket.listenerCount("error")==1){

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

        // If we are connected, we can return immediately
        if(this._connected) return Promise.resolve();

        // Only allow ourthis to be called once per actual connect
        if(this._connecting) return Promise.reject(new Error("You have already called connect() once. Still trying to connect!"));

        return new Promise((resolve, reject)=>{

            this._connecting=true;

            // If we try to createConnection immediately something hangs under certain circumstances.  HACK
            setTimeout(()=>{

                let callback=()=>{

                    this._connecting=false;
                    this._connected=true;
                    this.emit("connect", this._socket);
                    resolve();
                };

                this.socket=this.path?net.createConnection(this.path, callback):net.createConnection(this.port, this.address, callback);

                // This socket is new and only has the error handlers that we created when we used the this.socket setter.  Add one more
                this.socket.once("error",(e)=>{

                    if(this._socket && this._connecting===true && this._connected===false){

                        this._connecting=false;
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
            type    :    o.constructor.name,
            data    :    o,
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
                "type"    :    o.constructor.name,
                data    :    o
            };

        } else {

            m=o;
            if(callback) throw new Error("Unable to use remote callback - peer type must be Sockhop");
        }

        if((this._socket && this._socket.destroyed) || this._socket === null){

            return Promise.reject(new Error("Client unable to send() - socket has been destroyed"));
        }

        // Handle remote callback setup
        if(callback) {

            if (typeof(callback)!= 'function') throw new Error("remote_callback must be a function");

            // A reply is expected. Tag the message so we will recognize it when we get it back
            m.id=uuidv4();
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

        // Remove any old timers
        if(this.interval_timer!==null){
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
                if(!this._connected) return;

                // Send a new ping on each timer
                let p = new SockhopPing();

                // Save new ping
                this.pings.push(p);

                // Delete old pings
                while(this.pings.length>4) this.pings.shift();

                // If all (but at least 4) pings are unanswered, take action!
                let unanswered=this.pings.reduce((a,v)=>a+(v.unanswered()?1:0),0);

                if(this.pings.length>3 && this.pings.length==unanswered){

                    // console.log("disconnecting due to ping count = "+unanswered);

                    // Destroy socket, emit 'disconnect' event, mark ourthis as disconnected.  Will also clear any old pings
                    this._end_socket();
                    return;
                }

                // If we get this far, send the ping.
                this.send(p).catch(()=>{

                    // Even if it fails, we are remembering that we sent it and will disconnect after enough failures
                });

            }, delay);
        }
    }



    /**
     * disconnect
     *
     * Disconnect the socket (send FIN)
     * Pinging will also be turned off... if you want to keep pinging, you will need to call .ping() again after you connect again
     *
     * @return Promise
     */
    disconnect(){

        // Disable auto reconnect (else we will just connect again)
        this._auto_reconnect=false;
        this.ping(0); // Stop pinging
        this._socket.end();
        this._socket.destroy();

        // Old socket is dead
        this._end_socket();
        return Promise.resolve();
    }
}


module.exports = exports = SockhopClient;

const net = require("net");
const tls = require("tls");
const { EventEmitter } = require("events");
const { v4 : uuidv4 } = require("uuid");

const ObjectBuffer = require("./ObjectBuffer.js");
const TimedMap = require("./TimedMap.js");
const { SockhopPing, SockhopPong } = require("./SockhopPing.js");
const {
    SockhopRequest,
    SockhopResponsePacket,
    SockhopResponseReadableStream,
    SockhopResponseWriteableStream
} = require("./SockhopRequest.js");
const SockhopError = require("./SockhopError.js");


/**
 * connect event
 *
 * @event SockhopClient#connect
 * @param {net.Socket} sock the socket that just connected
 */

/**
 * receive object event
 *
 * We have successfully received an object from the server
 *
 * @event SockhopClient#receive
 * @param {object} object the received object
 * @param {object} meta metadata
 * @param {string} meta.type the received object constructor ("Object", "String", "Widget", etc)
 */

/**
 * receive request event
 *
 * We have successfully received a request object from the client
 *
 * @event SockhopClient#request
 * @param {SockhopRequest} req
 * @param {SockhopResponseWriteableStream} res
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
 * @fires SockhopClient#request
 * @fires SockhopError
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
     * @param {object} [opts.ssl_options={}] options to pass to the tls socket constructor, see `tls.connect` for details, note, if any options are provided, the `opts.ssl` flag is overriden as true
     * @param {number} [opts.auto_reconnect_interval=2000] the auto reconnection interval, in ms.
     * @param {string} opts.peer_type the type of client to expect.  Defaults to "Sockhop" and expects wrapped JSON objects.  Set to "json" to expect and deliver raw JSON objects
     * @param {(string|array)} [opts.terminator="\n"] the JSON object delimiter.  Passed directly to the ObjectBuffer constructor.
     * @param {boolean} [opts.allow_non_objects=false] allow non objects to be received and transmitted. Passed directly to the ObjectBuffer constructor.
     * @param {number} [opts.response_timeout] the length of time in ms that this map should hold values by default
     * @param {number} [opts.connect_timeout=5000] the length of time in ms to try to connect before timing out
     */

    constructor(opts={}){

        super();
        this.pings=[];

        this.path=opts.path||null;
        this.address=opts.address||"127.0.0.1";
        this.port=opts.port||50000;
        this._peer_type=(opts.peer_type!="json")?"Sockhop":"json";

        this._ssl_options=opts.ssl_options||{};
        this._ssl = opts.ssl||Object.keys(this._ssl_options).length > 1;

        this._ping_timer=null;

        this._auto_reconnect_timer=null;
        this._auto_reconnect=false;
        this._auto_reconnect_interval=opts.auto_reconnect_interval||2000;    //ms

        this._send_callbacks={}; // FIXME : this is a potential memory leak
        this._response_stream_map = new TimedMap({
            timeout : opts.response_timeout
        });

        this._connect_timeout = opts.connect_timeout||5000;

        this._connected=false;
        this._connecting=false;

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
     * Is the socket connected?
     *
     * @type {boolean}
     */
    get connected(){

        return this._connected;
    }

    /**
     * Is auto-reconnection active?
     *
     * @type {boolean}
     */
    get auto_reconnect_active(){
        return this._auto_reconnect
    }

    /**
     * auto_reconnect setter
     *
     * @deprecated
     * @param {boolean} auto_reconnect the desired auto_reconnect setting
     * @throws {Error} 'The .auto_reconnect setter has been deprecated in v2'
     */
    set auto_reconnect(b){
        throw new Error(`The .auto_reconnect setter has been deprecated in v2`);
    }

    /**
     * Perform an auto reconnet (internal)
     *
     * We have determined that an auto reconnect is necessary.
     * We will initiate it, and manage the fallout.
     *
     * @private
     */
    _perform_auto_reconnect(){

        // If we are already connected or connecting, we can disregard
        if(this.socket && this.socket.connecting) return;
        if(this.connected) return;

        this._connect().catch((e)=>{ /* Ignore */ })
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
        if(was_connected) this.emit("disconnect", this.socket);

        // Delete socket
        if(this.socket) {

            this.socket.destroy();
            this.socket=null;
        }

        // Clear any pending pings
        this.pings=[];
    }


    /**
     * Start a persistant connection to the server
     *
     * Note, this method will only return once a valid connection has been achieved (and so could hang indefinitely).
     * This will also start an auto-reconnection timer which will attempt to keep this connection live. Use `.disconnect()`
     * to stop.
     *
     * @returns {Promise<this>} The socket is connected
     */
    async start(){
        this._auto_reconnect = true;

        // Refresh the auto-reconnect timer
        clearInterval(this._auto_reconnect_timer);
        this._auto_reconnect_timer = setInterval(()=>this._perform_auto_reconnect(), this._auto_reconnect_interval);

        if (this._connected) return this;
        return new Promise(res => {
            this.once("connect",() => res(this));
            // trigger the connection even immediately
            this._connect().catch(() => {/* ignore errors */});
        });
    }

    /**
     * Connect to the server
     *
     * @param {object} config
     * @param {boolean} [config.auto_reconnect=false] should the connection attempt to reconnect after the initial connection succeeds?
     * @throws {Error} if connection fails or times out
     * @returns {Promise<this>} if connection is successful
     */
    async connect({ auto_reconnect=false }={}){
        return this._connect().then(() => {
            this._auto_reconnect = auto_reconnect;

            // Refresh the auto-reconnect timer
            clearInterval(this._auto_reconnect_timer);
            if ( this._auto_reconnect ) this._auto_reconnect_timer = setInterval(()=>this._perform_auto_reconnect(), this._auto_reconnect_interval)

            return this;
        });
    }

    /**
     * Connect
     *
     * Connect to the server
     * N.B.: The internals of net.socket add their own "connect" listener, so we can't rely on things like sock.removeAllListeners("connect") or sock.listenerCount("connect") here
     *
     * @private
     * @returns {Promise}
     */
    async _connect(){

        // If we are connected, we can return immediately
        if(this._connected) return;

        // Only allow ourthis to be called once per actual connect
        if(this._connecting) throw new SockhopError("You have already called connect() once. Still trying to connect!", "ERR_MULTICONNECT");

        this._connecting=true;

        // If we try to createConnection immediately something hangs under certain circumstances.  HACK
        await new Promise(res => setTimeout(res,0));
        return new Promise((resolve, reject)=>{

            // Set a timeout in case anything hangs
            const timebomb = setTimeout(()=>{
                if(this.socket && this._connecting===true && this._connected===false){
                    this._connecting=false;
                    reject(new Error("Timeout exceeded on connect()"));
                }
            }, this._connect_timeout);


            const callback=()=>{

                this._connecting=false;
                this._connected=true;

                // TODO : use the authorization status to negotitate if connections where successful
                // if ( this._ssl && !this.socket.authorized ) { /* throw some kind of error here using `this._socket.authorizationError` */ }

                this.emit("connect", this.socket);
                clearTimeout(timebomb);
                resolve();
            };

            // Create the actual socket connection
            let socket;
            if ( this._ssl ) {
                socket=this.path?tls.connect(this.path, this._ssl_options, callback):tls.connect(this.port, this.address, this._ssl_options, callback);
            } else {
                socket=this.path?net.createConnection(this.path, callback):net.createConnection(this.port, this.address, callback);
            }

            // Save a reference
            this.socket = socket;


            // Configure the socket
            socket
                .on("end",()=>this._end_socket())
                .on("data", (buf)=>{
                    this._objectbuffer.buf2obj(buf).forEach((o)=>{
                        this._on_recieved_object(o);
                    });
                })
                .on("error",(e)=>{

                    // If we are still connected but got an ECONNRESET, kill the connection.
                    if(this._connected && e.toString().match(/ECONNRESET/)){

                        this._end_socket();

                    // We got 'This socket is closed' but we are supposed to auto reconnect.  Handle quietly
                    } else if(e.toString().match(/This socket is closed/) && this._auto_reconnect===true) {

                        this._end_socket();

                    // ECONNREFUSED but we are supposed to auto reconnect (or we are connecting, in which case _connect() will reject and emitting an error would be superfluous)
                    } else if( e.toString().match(/ECONNREFUSED/) && (this._auto_reconnect || this._connecting)) {

                        // Ignore

                    } else {
                        // Pass all other errors along to the other handlers
                        this.emit("error",e);
                    }
                }).once("error",(e) => {
                    // If we are in the initial connection phase, throw the error
                    if(socket && this._connecting===true && this._connected===false){
                        this._connecting=false;
                        return reject(e);
                    }
                });
        });
    }


    /**
     * Get bound address
     *
     * @return {string} the IP address we are bound to
     */
    get_bound_address(){

        return this.socket.address().address;
    }

    /**
     * Trigger a remote callback
     *
     * Our side received a message with a callback, and we are now triggering that remote callback
     *
     * @private
     * @param {string} id the id of the remote callback
     * @param {object} o the object we want to send as part of our reply
     * @throws SockhopError
     */
    _trigger_remote_callback(id, o) {

        let m={
            type : o.constructor.name,
            data : o,
            callback_id: id
        };

        if(this.socket.destroyed){

            this.socket.emit("end");
            throw new SockhopError("Client unable to send() - socket has been destroyed", "ERR_SOCKET_DESTROYED");
        }

        this.socket.write(this._objectbuffer.obj2buf(m));
    }

    /**
     * Handle an object from the Objectbuffer parser
     *
     * @private
     * @param {object} o
     */
    _on_recieved_object(o) {
        switch (o.type) {
        case "SockhopPing":
            // Handle SockhopPing requests with silent SockhopPong
            this.send(new SockhopPong(o.data))
                .catch(()=>{});    // Ignore any sending problems, there is nothing further we need to do
            break;

        case "SockhopPong":
            // Handle SockhopPong
            this.pings.forEach(p => {
                p.conclude_with_pong(o.data);
            });
            break;

        case "SockhopRequest":
            // Handle SockhopRequest
            this.emit("request", SockhopRequest.parse(o.data), SockhopResponseWriteableStream.from_request(o.data, this));
            break;

        case "SockhopResponsePacket":
            // Handle SockhopResponsePacket
            this._on_response_packet(SockhopResponsePacket.parse(o.data));
            break;

        default:
            // Handle generic object type
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

                    this.emit("receive", o.data, {type:o.type}); // Remote end sends type: "Widget", "Array", etc
                }


            } else {

                this.emit("receive", o, {type: o.constructor.name }); // We read converted data directly, will be "String" or "Object"
            }
        }
    }

    /**
     * Handle a received reponse packet
     * @private
     * @param {SockhopResponsePacket} pkt
     */
    _on_response_packet(pkt) {
        let stream = this._response_stream_map.get(pkt.uuid);
        if ( !stream ) return; // ignore non-existent streams
        stream.receive_packet(pkt);
    }

    /**
     * Send
     *
     * Send an object to the server
     * @param {object} object to be sent over the wire
     * @param {function} [rcallback] Callback when remote side calls meta.callback (see receive event) - this is basically a remote Promise
     * @return {Promise}
     * @throws {SockhopError}
     */
    send(o, callback){


        // Create a message
        let m;
        if(this._peer_type=="Sockhop") {

            m={
                "type" : o.constructor.name,
                data : o
            };

        } else {

            m=o;
            if(callback) throw new SockhopError("Unable to use remote callback - peer type must be Sockhop", "ERR_REMOTE_CALLBACK_TYPE");
        }

        // Handle remote callback setup
        if(callback) {

            if (typeof(callback)!= 'function') throw new SockhopError("remote_callback must be a function", "ERR_REMOTE_CALLBACK_TYPE");

            // A reply is expected. Tag the message so we will recognize it when we get it back
            m.id=uuidv4();
            this._send_callbacks[m.id]=callback;
        }

        return this._send_message(m);
    }

    /**
     * Send a message
     *
     * @private
     * @param {object} msg to be sent over the wire
     * @return {Promise}
     * @throws {SockhopError}
     */
    _send_message(msg) {
        if((this.socket && this.socket.destroyed) || this.socket === null){
            return Promise.reject(new SockhopError("Client unable to send() - socket has been destroyed", "ERR_SOCKET_DESTROYED"));
        }
        return new Promise(res => this.socket.write(this._objectbuffer.obj2buf(msg), res));
    }

    /**
     * Make a request
     *
     * Send a request to the server
     * @param {object} object to be sent over the wire
     * @param {object} config
     * @param {?number} [config.timeout]
     * @return {Promise<SockhopResponseReadableStream>}
     * @throws {SockhopError}
     */
    request(o, { timeout }={}) {

        if ( this._peer_type !== "Sockhop" ) {
            return Promise.reject(new SockhopError("Unable to use requests - peer type must be Sockhop", "ERR_REQUEST_TYPE"));
        }

        // Create a request and response stream
        let req = SockhopRequest.from_data(o);

        // Send the request message, then return a promise which resolves on response
        return this._send_message({ type: "SockhopRequest", data:req }).then(() => {
            let res = SockhopResponseReadableStream.from_request(req);
            this._response_stream_map.set(
                res.uuid,
                res,
                (reason) => {
                    switch (reason) {
                    case "deleted":
                        // only happens because the stream ended, so nothing to do here
                        break;
                    case "timed-out":
                        res.end(new SockhopError("Response stream timed out before ending","ERR_RESPONSE_TIMEOUT"));
                        break;
                    default:
                        // Something ungraceful happned, make sure the stream stops
                        res.end(new SockhopError("Response stream was stopped locally because "+reason));
                        break;
                    }
                },
                timeout
            );
            res.once("end",() => {
                this._response_stream_map.delete(res.uuid);
            });
            return res;
        });
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
        if(this._ping_timer!==null){
            clearInterval(this._ping_timer);
            this._ping_timer=null;
        }

        // Clear old pings
        this.pings=[];

        // Set up new timer
        if(delay!==0){

            // Set up a new ping timer
            this._ping_timer=setInterval(()=>{

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
     * @returns {Promise}
     */
    async disconnect(){

        // Stop auto reconnect (else we will just connect again)
        clearInterval(this._auto_reconnect_timer);

        // Stop pinging
        this.ping(0);

        // Bail early if the socket is already dead
        if (
            this.socket === undefined // socket has never been created
            || this.socket === null   // socket has previously been ended
        ) {
            return;
        }

        this.socket.end();
        this.socket.destroy();
        this._response_stream_map.stop();

        // Old socket is dead
        this._end_socket();
    }
}


module.exports = exports = SockhopClient;

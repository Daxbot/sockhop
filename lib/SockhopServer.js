const net = require("net");
const { EventEmitter } = require("events");
const { randomUUID: uuidv4 } = require("crypto");

const JSONObjectBuffer = require("./JSONObjectBuffer.js");
const { SockhopPing, SockhopPong } = require("./SockhopPing.js");
const SockhopSession = require("./SockhopSession.js");
const SockhopError = require("./SockhopError.js");
const SockhopHandshake = require("./SockhopHandshake.js");


/**
 * connect event
 *
 * @event SockhopServer#connect
 * @param {net.Socket} sock the socket that just connected
 * @param {SockhopSession} session the session of the socket
 */

/**
 * receive object event
 *
 * We have successfully received an object from the client
 *
 * @event SockhopServer#receive
 * @param {object} object the received object
 * @param {object} meta metadata
 * @param {string} meta.type the received object constructor ("Object", "String", "Widget", etc)
 * @param {net.Socket} meta.socket the socket that sent us this object
 * @param {SockhopSession} meta.session the session of the socket
 * @param {Function} [meta.callback] the callback function, if the client is requesting a callback. Pass an object you want returned to the client
 */


/**
 * disconnect event
 *
 * @event SockhopServer#disconnect
 * @param {net.Socket} sock the socket that just disconnected
 * @param {SockhopSession} session the session of the socket
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
 * @fires SockhopError
 */
class SockhopServer extends EventEmitter {


    /**
     * Constructs a new SockhopServer
     *
     * @param {object} [opts] an object containing configuration options
     * @param {string} [opts.path] the path for a Unix domain socket.  If used, this will override the address and port values.
     * @param {string} [opts.address="127.0.0.1"] the IP address to bind to
     * @param {number} [opts.port=50000] the TCP port to use
     * @param {(string|array)} [opts.terminator="\n"] the JSON object delimiter.  Passed directly to the JSONObjectBuffer constructor.
     * @param {boolean} [opts.allow_non_objects=false] allow non objects to be received and transmitted. Passed directly to the JSONObjectBuffer constructor.
     * @param {Object} [opts.session_type=SockhopSession] the identifier for a SockhopSession class (or inhereted class)
     * @param {number} [opts.handshake_timeout=3000] the length of time in ms to wait for a handshake response before timing out
     * @param {boolean} [opts.compatibility_mode=false] enable compatibility mode, which will disable handshakes for simulating 1.x behavior
     */
    constructor(opts={}){

        super();
        this.address=opts.address||"127.0.0.1";
        this.path=opts.path||null;
        this.port=opts.port||50000;
        this._session_type = opts.session_type||SockhopSession;
        this._sockets=[];
        this._sessions=[];         // One per socket, using corresponding indices
        this._send_callbacks={}; // FIXME : this is a potential memory leak
        this.pings=new Map();
        this.server=net.createServer();
        this.interval_timer=null;
        this._handshake_timeout = opts.handshake_timeout || 3000; // ms
        this._compatibility_mode = !!opts.compatibility_mode;


        // Setup server
        this.server.on('connection', async (sock) => {
            sock._init_complete = false; // Custom property - true once handshake is complete
            sock._handshake_received = false;
            sock._handshake_resolved = false;
            sock.compatibility_mode = true;

            sock.json_object_buffer=new JSONObjectBuffer({
                terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
                allow_non_objects: opts.allow_non_objects
            });
            sock.json_object_buffer.on("error",(e)=>{
                this.emit("error", e, sock, null);    // Should we pass along a reference to sock?
            });

            // Setup the session of the socket
            let sess = await this._session_type._from_socket( sock, this );

            // Save the socket and session in corresponding indices
            this._sockets.push(sock);
            let i = this._sockets.indexOf(sock);
            this._sessions[i] = sess;

            // Setup empty pings map
            this.pings.set(sock,[]);

            // Setup the socket events
            sock.on("end",()=>{

                // Emit event
                sess.end().then(()=>{
                    this.emit_async("disconnect", sock, sess);
                });

                // Remove the socket and session
                const index = this._sockets.indexOf(sock);
                if ( index >= 0 ) {
                    this._sockets.splice(index, 1);
                    this._sessions.splice(index, 1);
                }

                // Clean up the pings
                this.pings.delete(sock);

                // Make sure that this socket is totally dead
                sock.destroy();

            }).on('data',(buf)=>{

                sock.json_object_buffer.buf2obj(buf).forEach((o)=>{
                    this._on_recieved_object(o, sock, sess);
                });

            }).on("error",(e)=>{
                if ( e.code == "ECONNRESET" ) {
                    // We don't allow half-open sockets, so this should be forcably treated like a disconnect
                    sock.emit("end");
                } else {
                    // Bubble socket errors
                    this.emit("error", e, sock, sess);
                }
            });

            let success=true;
            if ( !this._compatibility_mode ) await new Promise((resolve,reject) => {
                // Pre-declare
                let timeout;
                let timed_out = false;

                // Create a funtion to handle delayed handshake response
                const func = () => {
                    if ( timed_out ) return;
                    sock._handshake_resolved = true;
                    clearTimeout(timeout);
                    resolve();
                };

                // Set a timeout in case the handshake never arrives
                timeout = setTimeout(() => {
                    timed_out = true;
                    sock.off("_handshake", func);
                    resolve();
                }, this._handshake_timeout);

                // Send handshake
                this.send(sock, new SockhopHandshake(),(response)=>{
                    if ( timed_out ) return;

                    if ( sock._handshake_received ) {
                        // We have both sent and received handshake, so we are good to go
                        sock._handshake_resolved = true;
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        // We still need to receive handshake
                        sock.once("_handshake",func);
                    }

                }).catch(reject);

            }).catch((e)=>{
                success=false;
                this.emit("error", e);
            });
            if(!success) return;

            sock._init_complete = true;

            // Emit event
            this.emit_async("connect", sock, sess);

        }).on("error",(e)=>{
            // Bubble server errors
            this.emit("error", e, null, null);
        });
    }

    /**
     * Handle an object from the Objectbuffer parser
     *
     * @private
     * @param {object} o
     * @param {net.socket} sock
     * @param {SockhopSession} sess
     */
    _on_recieved_object(o, sock, sess) {

        switch (o.type) {
        case "SockhopHandshake":
            if (this._compatibility_mode) {
                // Ignore handshakes in compatibility mode
                return;
            }
            sock._handshake_received = true;
            sock.emit("_handshake", o.data);
            this._trigger_remote_callback(sock, o.id, { /* TODO */ });
            break;
        case "SockhopPing":
            // Handle SockhopPing requests with silent SockhopPong
            this.send(sock,new SockhopPong(o.data)).catch(()=>{});    // We don't care about errors here
            break;

        case "SockhopPong":
            // Handle SockhopPong
            this.pings.get(sock).forEach(p => {
                p.conclude_with_pong(o.data);
            });
            break;

        default:
            // Handle remote callback (callback activated)
            if(o.callback_id) {
                // Call the callback instead of bubbling the event
                this._send_callbacks[o.callback_id](o.data, {type:o.type});
                delete this._send_callbacks[o.callback_id];

                // Remote end is requesting callback
            } else if (o.id){
                this.emit("receive", o.data, {
                    type : o.type,
                    socket : sock,
                    session : sess,
                    callback : (oo={})=>{ this._trigger_remote_callback(sock, o.id, oo);}
                });
            } else {
                this.emit("receive", o.data, {
                    type : o.type, // Remote end sends type: "Widget", "Array", etc
                    socket : sock,
                    session : sess
                });
            }
        }
    }


    /**
     * Emit async
     *
     * We end up with odd event loops sometimes, e.g. if an on("disconnect") calls .sendall(), another "disconnect" will be emitted.
     * This functon emits evens asynchronously and breaks the chain
     * //HACK  -- THIS IS A HACKY FIX -- //HACK
     */
    emit_async() {
        setTimeout(()=>{ this.emit.apply(this,arguments); },0);
    }

    /**
     * Socket getter
     *
     * @type {net.Socket[]} the underlying socket objects for our clients
     */
    get sockets(){

        return this._sockets;
    }

    /**
     * Session getter
     *
     * @type {SockhopSession[]} the underlying session instances for our clients
     */
    get sessions(){

        return this._sessions;
    }

    /**
     * compatibility_mode getter
     * @return {boolean} compatibility_mode whether or not we are in compatibility mode
     */
    get compatibility_mode() {
        return this._compatibility_mode;
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
                this._sockets.forEach((s) => {
                    if ( !s._init_complete ) return;

                    let p = new SockhopPing();
                    this.send(s, p).catch((e) => {
                        if ( e && e.message === "Socket was destroyed" ) {
                            // ingore pings for destroyed sockets
                            return;
                        } else {
                            throw e;
                        }
                    });

                    // Save new ping
                    let pings=this.pings.get(s);

                    if (!pings)
                        return;

                    pings.push(p);

                    // Delete old pings
                    while(pings.length>4) pings.shift();

                    let unanswered=pings.reduce((a,v)=>a+(v.unanswered()?1:0),0);
                    if(pings.length>3 && pings.length==unanswered) this.kill_socket(s);
                });

            }, delay);
        }
    }

    /**
     * Listen
     *
     * Bind and wait for incoming connections
     * @return {Promise<net.server>}
     */
    listen(){

        if ( this.path ) {
            return new Promise(res => this.server.listen(this.path, () => res(this.server)));
        } else {
            return new Promise(res => this.server.listen(this.port, this.address, () => res(this.server)));
        }
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
     * @throws SockhopError
     */
    _trigger_remote_callback(sock, id, o) {

        let m={
            type : o.constructor.name,
            data : o,
            callback_id : id
        };

        if(sock.destroyed){

            sock.emit("end");
            throw new SockhopError("Client unable to send() - socket has been destroyed", "ERR_SOCKET_DESTROYED");
        }

        sock.write(sock.json_object_buffer.obj2buf(m));
    }

    /**
     * Send
     *
     * Send an object to one clients
     * @param {net.socket} socket on which to send it
     * @param {object} object that we want to send
     * @param {function} [callback] Callback when remote side calls meta.done (see receive event) - this is basically a remote Promise
     * @throws SockhopError
     * @return {Promise}
     */
    send(sock, o, callback){

        // Sanity checks
        if(!o || typeof(o)=="undefined") throw new SockhopError("SockhopServer send() requires a socket and data", "ERR_BAD_DATA");

        // Create a message
        let m = {
            type : o.constructor.name,
            data : o
        };

        // Handle remote callback setup
        if(callback) {

            if (typeof(callback)!= 'function') throw new SockhopError("remote_callback must be a function", "ERR_REMOTE_CALLBACK_TYPE");

            // A reply is expected. Tag the message so we will recognize it when we get it back
            m.id=uuidv4();
            this._send_callbacks[m.id]=callback;
        }

        return this._send_message(sock, m);

    }

    /**
     * Send a message
     *
     * @private
     * @param {net.socket} sock
     * @param {object} msg to be sent over the wire
     * @return {Promise}
     * @throws {SockhopError}
     */
    _send_message(sock, msg) {
        if(!sock) {
            return Promise.reject(new SockhopError("SockhopServer sending requires a socket", "ERR_NO_SOCKET"));
        }
        if(sock.destroyed){
            sock.emit("end");
            return Promise.reject(new SockhopError("Socket was destroyed", "ERR_SOCKET_DESTROYED"));
        }
        return new Promise(res => sock.write(sock.json_object_buffer.obj2buf(msg), res));
    }

    /**
     * Sendall
     *
     * Send an object to all clients
     * @param {object} object to send to all connected clients
     * @return {Promise}
     */
    sendall(o){

        // Check each socket in case it was destroyed (unclean death).  Remove bad.  Send data to good.
        return Promise.all(this._sockets.map((s)=>{if(s.destroyed) s.emit("end"); else return this.send(s,o);}));
    }

    /**
     * Stops a client connection
     *
     * @param {net.Socket} sock the client socket to kill
     * @return {Promise}
     */
    kill_socket(sock){
        return new Promise(res => {
            sock.end(res);
            sock.emit("end");
            // Make sure the promise doesn't hang if the
            //  socket has already closed
            if ( sock.readyState === "closed" ) res();
        });
    }

    /**
     * Disconnect
     *
     * Disconnect all clients
     * Does not close the server - use close() for that
     * @return {Promise} resolves when all sockets are killed
     */
    disconnect(){
        this.ping(0);    // Stop all pinging
        return Promise.all(this._sockets.map((s)=>this.kill_socket(s)));
    }

    /**
     * Close
     *
     * Disconnects any clients and closes the server
     * @return {Promise} resovles when all sockets are killed and the server closed
     */
    close(){

        return Promise.all([
            this.disconnect(),
            new Promise(res => this.server.close(res))
        ]).then(()=>{

            // Replace the server object (may not be necessary, but seems cleaner)
            this.server=net.createServer();
            return Promise.resolve();
        }).catch((e)=>{

            // Ignore "not running" (means we just shut down the server quickly)
            if(e.toString().match(/not running/)){

                this.server=net.createServer();
                return Promise.resolve();
            }
        });
    }
}


module.exports = exports = SockhopServer;

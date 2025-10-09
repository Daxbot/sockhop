const net = require("net");
const { EventEmitter } = require("events");
const { randomUUID: uuidv4 } = require("crypto");

const JSONObjectBuffer = require("./JSONObjectBuffer.js");
const ObjectBuffer = require("./ObjectBuffer.js");
const { SockhopPing, SockhopPong } = require("./SockhopPing.js");
const SockhopSession = require("./SockhopSession.js");
const SockhopError = require("./SockhopError.js");
const SockhopHandshake = require("./SockhopHandshake.js");
const SockhopBinaryModeTransition = require("./SockhopBinaryModeTransition.js");


/**
 * connect event
 *
 * this fires when we have successfully connected to the client, but before the handshake completes/times-out
 *
 * NOTE : unless you are in compatibility mode or trying to interoperate with a 1.x remote, you should probably
 *        wait for the `handshake` event instead of `connect`. See discussion in the `handshake` event docs for more information
 *
 * @event SockhopServer#connect
 * @param {net.Socket} sock the socket that just connected
 * @param {SockhopSession} session the session of the socket
 */

/**
 * handshake event
 *
 * This fires when the handshake completes or times out
 *
 * WARNING: if the other side of the connection get's a connect event, they can begin sending data immediately.
 *          regardless of whether or not the handshake completes or times out, or is simply ignored (compatibility mode
 *          or 1.x library version). This means data can be sent before the handshake completes, unless both sides
 *          have agreed to wait for the handshake event before sending any data. It is recommnded that in situations
 *          where you cannot gaurantee that both sides are using Sockhop 2.x with handshakes, that you should listen
 *          for the connection event for the purpose of adding event handlers, but wait for the handshake event
 *          to proactively send any data, so that the send logic can depending on a know handshake state. This will
 *          have the added benefit of ensuring that you will not try to tx until the binary mode negotiation is complete,
 *          (which finish immediately before the handshake event fires). Finally, this will allow a smooth transition
 *          when all 1.x/compoatibility mode clients are upgraded to 2.x with handshakes, since in that case, both
 *          sides will already be waiting for the handshake event before sending any data.
 *
 * @event SockhopServer#handshake
 * @param {net.Socket} sock the socket that just connected
 * @param {SockhopSession} session the session of the socket
 * @param {boolean} success true if the handshake was successful, false if it timed out or failed
 * @param {?Error} error if the handshake failed, this will contain the error, otherwise undefined
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
 * @param {boolean} handshaked true if we were previously handshaked, false otherwise
 */

/**
 * unhandshake event
 *
 * This fires when we were previously handshaked, but the connection was lost. This is analogous
 * to the `disconnect` event, but only fires if we were previously handshaked. If you are interoperating
 * with a 1.x/compatibility mode remote, this event will not fire, since the handshake will never succeed.
 *
 * @event SockhopServer#unhandshake
 * @param {net.Socket} sock the socket that just disconnected
 * @param {SockhopSession} session the session of the socket
 */


/**
 * sending event
 *
 * NOTE : This event is only emitted if the SockhopServer is in debug mode
 * @event SockhopServer#debug:sending
 * @param {object} object the object we are sending
 * @param {Buffer} buffer the buffer we are sending
 * @param {boolean} binary_mode true if we are sending in binary mode
 * @param {net.Socket} sock the socket we are sending on
 * @param {SockhopSession} session the session of the socket
 */

/**
 * received event
 *
 * NOTE : This event is only emitted if the SockhopServer is in debug mode
 * @event SockhopServer#debug:received
 * @param {object} object the object we just received
 * @param {Buffer} buffer the buffer we just received
 * @param {boolean} binary_mode true if we are receiving in binary mode
 * @param {net.Socket} sock the socket we are receiving on
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
 * @fires SockhopServer#unhandshake
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
     * @param {boolean} [opts.debug=false] run in debug mode -- which adds additional emits
     * @param {boolean} [opts.allow_binary_mode=true] request binary mode during handshake (ignored in compatibility mode)
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
        this._debug=opts.debug||false;
        this._allow_binary_mode = opts.allow_binary_mode??(!this._compatibility_mode); // Default to true unless in compatibility mode
        if ( this._compatibility_mode && this._allow_binary_mode ) {
            // We cannot request binary mode if we are in compatibility mode
            throw new SockhopError("You cannot request binary mode in compatibility mode", "ERR_HANDSHAKE_COMPATIBILITY_MODE");
        }


        // Setup server
        this.server.on('connection', async (sock) => {
            sock._init_complete = false; // Custom property - true once handshake is complete
            sock._handshake_received = false;
            sock._handshake_successful = false;
            sock._connected = true; // Custom property - false once "end" is emitted
            sock.compatibility_mode = true;

            sock.json_object_buffer=new JSONObjectBuffer({
                terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
                allow_non_objects: opts.allow_non_objects
            });
            sock.json_object_buffer.on("error",(e)=>{
                this.emit("error", e, sock, null);    // Should we pass along a reference to sock?
            });
            sock.object_buffer=new ObjectBuffer({
                terminator: (typeof(opts.terminator) == "undefined")?"\n":opts.terminator,
                allow_non_objects: opts.allow_non_objects
            });
            sock.object_buffer.on("error",(e)=>{
                this.emit("error", e, sock, null);    // Should we pass along a reference to sock?
            });
            sock.binary_mode = {
                rx: false,
                tx: false,
            };

            // Setup the session of the socket
            let sess = await this._session_type._from_socket( sock, this );
            sock._session = sess;

            // Save the socket and session in corresponding indices
            this._sockets.push(sock);
            let i = this._sockets.indexOf(sock);
            this._sessions[i] = sess;

            // Setup empty pings map
            this.pings.set(sock,[]);

            // Setup the socket events
            sock.on("end",()=>{
                sock._connected = false;

                // Emit event
                sess.end().finally(()=>{
                    const was_handshaked = sock._handshake_successful;
                    this.emit_async("disconnect", sock, sess, was_handshaked);
                    if ( was_handshaked ) this.emit_async("unhandshake", sock, sess);
                    setImmediate(() => sess._trigger_disconnect_emit(was_handshaked));
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

                if ( sock.binary_mode.rx ) {
                    sock.object_buffer.buf2obj(buf, { return_buffers: this.debug }).forEach(({ name, obj, buffer })=>{
                        if ( this.debug ) {
                            this.emit("debug:received", obj, buffer, sock.binary_mode.rx, sock, sess);
                            sess._trigger_debug_received_emit(obj, buffer, sock.binary_mode.rx);
                        }

                        // TODO : handle other types
                        this._on_recieved_object(
                            obj.type,
                            obj.data,
                            {
                                callback_response: name.endsWith("callback:response"),
                                callback_request: name.endsWith("callback:request"),
                                callback_id: obj.callback_id
                            },
                            sock,
                            sess
                        );
                    });
                } else {
                    sock.json_object_buffer.buf2obj(buf, { return_buffers: this.debug }).forEach(({value:o, buffer})=>{
                        if ( this.debug ) {
                            this.emit("debug:received", o, buffer, sock.binary_mode.rx, sock, sess);
                            sess._trigger_debug_received_emit(o, buffer, sock.binary_mode.rx);
                        }

                        this._on_recieved_object(
                            o.type,
                            o.data,
                            { callback_response: !!o.callback_id, callback_request: !!o.id, callback_id: o.id||o.callback_id },
                            sock,
                            sess
                        );
                    });
                }

            }).on("error",(e)=>{
                if ( e.code == "ECONNRESET" ) {
                    // We don't allow half-open sockets, so this should be forcably treated like a disconnect
                    sock.emit("end");
                } else {
                    // Bubble socket errors
                    this.emit("error", e, sock, sess);
                }
            });

            // Emit event
            this.emit_async("connect", sock, sess);

            if ( this._compatibility_mode ) {
                sock._init_complete = true;
                return;
            }


            // WARNING:
            // This promise allows us to additionally wait until the binary mode transition is completed
            // before we emit the handshake event. So, make sure we ever get to a resolve in the
            // promise below, there there is *definitely* a way that this callback can get called,
            // otherwise the await will hang forever
            let binary_mode_resolved_callback = null;
            const binary_mode_resolved_promise = new Promise(res => binary_mode_resolved_callback = res);

            let error=undefined;
            await new Promise((resolve,reject) => {
                // Pre-declare
                let timeout;
                let timed_out = false;

                // Create a funtion to handle delayed handshake response
                const func = () => {
                    if ( timed_out ) return;
                    clearTimeout(timeout);
                    resolve(); // Resolve 1 of 2
                };

                // Set a timeout in case the handshake never arrives
                timeout = setTimeout(() => {
                    timed_out = true;
                    sock.off("_handshake_pkt_received", func);
                    reject(new SockhopError("Timeout exceeded waiting for handshake()","ERR_HANDSHAKE_TIMEOUT"));
                }, this._handshake_timeout);

                // Send handshake
                this.send(sock, new SockhopHandshake({ request_binary_mode:this._allow_binary_mode }),(response)=>{
                    if ( timed_out ) return; // NOTE : we dont need to call binary_mode_resolved_callback(), since timeouts will reject the global promise, meaning we will skip await the binary mode promise

                    if ( response && response.allow_binary_mode ) {
                        // Send packet, and immediately swithc once the packet clears
                        this.send(sock, new SockhopBinaryModeTransition()).then(() => {
                            sock.binary_mode.tx = true;
                            sock.emit("binary_mode:tx", true);
                            sock._session._trigger_binary_mode_emit("tx", true);
                        }).catch((err) => {
                            // Failed to send, just emit the error
                            this.emit("error", err, sock, sess);
                        }).finally(() => {
                            binary_mode_resolved_callback();
                        });
                    } else {
                        // No binary mode, just resolve
                        binary_mode_resolved_promise();
                    }


                    // Below here are all the pathways to resolve, and we can only be here if:
                    //   (1) we did not time out -> which rejects, so no need to call binary_mode_resolved_callback()
                    //   (2) we successfully send the binary mode transition packet -> which calls binary_mode_resolved_callback()
                    //   (3) we failed to send the binary mode transition packet -> which rejects, so no need to call binary_mode_resolved_callback()
                    //   (4) we are not using binary mode -> which calls binary_mode_resolved_callback()
                    if ( sock._handshake_received ) {
                        clearTimeout(timeout);
                        resolve(); // Resolve 2 of 2
                    } else {
                        // We still need to receive handshake
                        sock.once("_handshake_pkt_received",func); // Points to Resolve 1 of 2
                    }

                }).catch(reject);

            }).then(()=>{
                return binary_mode_resolved_promise;
            }).catch((e)=>{
                error=e;
            });

            sock._init_complete = true;
            sock._handshake_successful = !error;

            // Emit event
            this.emit_async("handshake", sock, sess, sock._handshake_successful, error);
            setImmediate(() => sess._trigger_handshake_emit(sock._handshake_successful, error));



        }).on("error",(e)=>{
            // Bubble server errors
            this.emit("error", e, null, null);
        });
    }

    /**
     * Handle an object from the Objectbuffer parser
     *
     * @private
     * @param {string} type the type of object received
     * @param {object} data the object received
     * @param {object} meta callback info
     * @param {boolean} meta.callback_response true if this is a response to a callback we sent
     * @param {boolean} meta.callback_request true if this is a request for a callback
     * @param {string} meta.callback_id the id of the callback
     * @param {net.socket} sock
     * @param {SockhopSession} sess
     */
    _on_recieved_object(type, data, { callback_response, callback_request, callback_id }={}, sock, sess) {

        switch (type) {
        case "SockhopHandshake":
            if (this._compatibility_mode) {
                // Ignore handshakes in compatibility mode
                return;
            }
            sock._handshake_received = true;
            sock.emit("_handshake_pkt_received", data);
            this._trigger_remote_callback(sock, sess, callback_id, {
                allow_binary_mode: data.request_binary_mode && this._allow_binary_mode
            });
            break;
        case "SockhopBinaryModeTransition":
            // Set binary node, since all future packets will be in binary mode
            sock.binary_mode.rx = true;
            sock.emit("binary_mode:rx", true);
            sock._session._trigger_binary_mode_emit("rx", true);
            break;
        case "SockhopPing":
            // Handle SockhopPing requests with silent SockhopPong
            this.send(sock,new SockhopPong(data)).catch(()=>{});    // We don't care about errors here
            break;

        case "SockhopPong":
            // Handle SockhopPong
            this.pings.get(sock).forEach(p => {
                p.conclude_with_pong(data);
            });
            break;

        default:
            // Handle remote callback (callback activated)
            if(callback_response) {
                // Call the callback instead of bubbling the event
                this._send_callbacks[callback_id](data, {type:type});
                delete this._send_callbacks[callback_id];

                // Remote end is requesting callback
            } else if (callback_request) {
                const callback = (oo={}) => { this._trigger_remote_callback(sock, sess, callback_id, oo); };
                this.emit("receive", data, {
                    type : type,
                    socket : sock,
                    session : sess,
                    callback,
                });
                sess._trigger_receive_emit(data, {
                    type : type,
                    callback,
                });
            } else {
                this.emit("receive", data, {
                    type : type, // Remote end sends type: "Widget", "Array", etc
                    socket : sock,
                    session : sess
                });
                sess._trigger_receive_emit(data, {
                    type : type,
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
        // Use setImmediate instread of setTimeout(()=>{},0) for slight performance improvement
        setImmediate(()=>{ this.emit.apply(this,arguments); });
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
     * debug mode getter
     *
     * @return {boolean} debug whether or not we are in debug mode
     */
    get debug(){
        return this._debug;
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
                    // Only proceed if the initialization if complete
                    // (handshake done or compatibility mode)
                    // NOTE : we will still respond to pings even if init is not complete
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
     * @param {SockhopSession} sess the session of the socket
     * @param {string} id the id of the remote callback
     * @param {object} o the object we want to send as part of our reply
     * @throws SockhopError
     */
    _trigger_remote_callback(sock, sess, id, o) {

        let m={
            type : o.constructor.name,
            data : o,
            callback_id : id
        };

        if(sock.destroyed){

            sock.emit("end");
            throw new SockhopError("Client unable to send() - socket has been destroyed", "ERR_SOCKET_DESTROYED");
        }

        let buff;
        if ( sock.binary_mode.tx ) {
            buff = sock.object_buffer.obj2buf(
                "sockhop:json:callback:response",
                {
                    type: m.type,
                    data: m.data,
                    callback_id: m.callback_id
                }
            );
        } else {
            buff = sock.json_object_buffer.obj2buf(m);
        }
        if ( this.debug ) {
            this.emit("debug:sending", m, buff, sock.binary_mode.tx, sock, sess);
            sess._trigger_debug_sending_emit(m, buff, sock.binary_mode.tx);
        }

        sock.write(buff);
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
    async send(sock, o, callback){

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
    async _send_message(sock, msg) {
        if(!sock) {
            return new SockhopError("SockhopServer sending requires a socket", "ERR_NO_SOCKET");
        }
        if(sock.destroyed){
            sock.emit("end");
            return new SockhopError("Socket was destroyed", "ERR_SOCKET_DESTROYED");
        }

        let buff;
        if ( sock.binary_mode.tx ) {
            if ( msg.id ) {
                buff = sock.object_buffer.obj2buf(
                    "sockhop:json:callback:request",
                    {
                        type: msg.type,
                        data: msg.data,
                        callback_id: msg.id
                    }
                );
            } else {
                buff = sock.object_buffer.obj2buf(
                    "sockhop:json",
                    {
                        type: msg.type,
                        data: msg.data,
                    }
                );
            }
        } else {
            buff = sock.json_object_buffer.obj2buf(msg);
        }

        if ( this.debug ) {
            this.emit("debug:sending", msg, buff, sock.binary_mode.tx, sock, sock._session);
            sock._session._trigger_debug_sending_emit(msg, buff, sock.binary_mode.tx);
        }
        return new Promise(res => sock.write(buff, res));
    }

    /**
     * Sendall
     *
     * Send an object to all clients
     * @param {object} object to send to all connected clients
     * @return {Promise}
     */
    async sendall(o){

        // Check each socket in case it was destroyed (unclean death).  Remove bad.  Send data to good.
        return Promise.all(this._sockets.map((s)=>{if(s.destroyed) s.emit("end"); else return this.send(s,o);}));
    }

    /**
     * Stops a client connection
     *
     * @param {net.Socket} sock the client socket to kill
     * @return {Promise}
     */
    async kill_socket(sock){
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
    async disconnect(){
        this.ping(0);    // Stop all pinging
        return Promise.all(this._sockets.map((s)=>this.kill_socket(s)));
    }

    /**
     * Close
     *
     * Disconnects any clients and closes the server
     * @return {Promise} resovles when all sockets are killed and the server closed
     */
    async close(){

        return Promise.all([
            this.disconnect(),
            new Promise(res => this.server.close(res))
        ]).then(()=>{

            // Replace the server object (may not be necessary, but seems cleaner)
            this.server=net.createServer();
            return;
        }).catch((e)=>{

            // Ignore "not running" (means we just shut down the server quickly)
            if(e.toString().match(/not running/)){

                this.server=net.createServer();
                return;
            }
        });
    }
}


module.exports = exports = SockhopServer;

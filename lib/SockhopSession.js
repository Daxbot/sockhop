const { EventEmitter } = require("events");

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
 * @event SockhopSession#handshake
 * @param {boolean} success true if the handshake was successful, false if it timed out or failed
 * @param {?Error} error if the handshake failed, this will contain the error, otherwise undefined
 */

/**
 * receive object event
 *
 * We have successfully received an object from the server
 *
 * @event SockhopSession#receive
 * @param {object} object the received object
 * @param {object} meta metadata
 * @param {string} meta.type the received object constructor ("Object", "String", "Widget", etc)
 * @param {function} meta.callback if the received object was sent with a callback, this is the function to call to respond
 */

/**
 * unhandshake event
 *
 * This fires when we were previously handshaked, but the connection was lost. This is analogous
 * to the `disconnect` event, but only fires if we were previously handshaked. If you are interoperating
 * with a 1.x/compatibility mode remote, this event will not fire, since the handshake will never succeed.
 *
 * @event SockhopSession#unhandshake
 */

/**
 * disconnect event
 *
 * @event SockhopSession#disconnect
 * @param {boolean} handshaked true if we were previously handshaked, false otherwise
 */

/**
 * sending event
 *
 * NOTE : This event is only emitted if the SockhopSession is in debug mode
 * @event SockhopSession#debug:sending
 * @param {object} object the object we are sending
 * @param {Buffer} buffer the buffer we are sending
 * @param {boolean} binary_mode true if we are sending in binary mode
 */

/**
 * received event
 *
 * NOTE : This event is only emitted if the SockhopSession is in debug mode
 * @event SockhopSession#debug:received
 * @param {object} object the object we just received
 * @param {Buffer} buffer the buffer we just received
 * @param {boolean} binary_mode true if we are receiving in binary mode
 */

/**
 * binary_mode:rx object event
 *
 * The other end of the connection will (from this packet onward) be sending us data in binary mode
 *
 * NOTE : for the session, this event will never fire with `false`, since we don't
 *        support reconnects on the server side. So in a socket lifecycle, this event
 *        *might* fire exactly once with `true` in the vacinity of the `handshake` event.
 *
 * NOTE : this event is has undetermined ordering with respect to the firing of `handshake`,
 *        meaning it could fire before or after `handshake`, depending on network timing.
 *        This is largely irrelevant, since the this event is related to how the library
 *        internally handles parsing incoming data, and not how we send data. Think of this
 *        event as informational only about the state of the other side of the connection.
 *
 * @event SockhopSession#binary_mode:rx
 * @param {boolean} enabled true if we are now receiving in binary mode
 */

/**
 * binary_mode:tx object event
 *
 * We will (from this packet onward) be sending data in binary mode.
 *
 * NOTE : if the handshake fails or times out, this event *will not* fire with `false`, since
 *        we are already not in binary mode. However, you can always check the state of binary mode
 *        using the `.binary_mode.tx` property.
 *
 * NOTE : More importantly, for the session, this event will *never* fire with `false`, since we don't
 *        support reconnects on the server side. So in a socket lifecycle, this event
 *        *might* fire exactly once with `true` just prior to the `handshake` event.
 *
 * NOTE : the `true` variant of this event will always fire *before* the `handshake` event,
 *        which means that you don't need to wait for both this event and `handshake`
 *        to know that your tx-ing data encoding has settled. As a result, you can probably
 *        ignore this event entirely, unless you are doing something really low-level.
 *
 * @event SockhopSession#binary_mode:tx
 * @param {boolean} enabled true if we are now receiving in binary mode
 */

/**
 * Base class wrapper for server-side sockets
 *
 * When a new connection is received by the server, the server will wrap
 * that socket with an instance of this (or child of this) class -- configurable
 * with the `session_type` option in the server's constructor. This class
 * allows for arbitrary user-data to be assigned to the clients (for example,
 * authentication state information) without having to abuse the underlying
 * net.Socket object.
 *
 * This class does almost nothing, apart from holding internal references to
 * the net.Socket and SockhopServer instances, and is really intended to be
 * extended. As such, there are several 'virtual' methods included here,
 * which users are encouraged to implement for their specific application.
 *
 * Sessions are the preferred way for users to interact with client connections,
 * in that users should write child classes which inhert from this base class to
 * interact with the net.Socket instance, and then have their applications call
 * the session methods, rather than calling socket methods directly. For instance,
 * users are discouraged from directly calling `socket.end()` to terminate
 * clients connection from the server. Rather, users should call `session.kill()`.
 *
 * @extends EventEmitter
 * @fires SockhopSession#handshake
 * @fires SockhopSession#unhandshake
 * @fires SockhopSession#disconnect
 * @fires SockhopSession#receive
 * @fires SockhopSession#debug:sending
 * @fires SockhopSession#debug:received
 * @fires SockhopSession#binary_mode:rx
 * @fires SockhopSession#binary_mode:tx
 */
class SockhopSession extends EventEmitter {
    /**
     * Constructor
     *
     * By default, I just save references to the socket and the server
     *
     * @param {net.Socket} sock the socket object
     * @param {SockhopServer} server a reference to the SockhopServer
     */
    constructor( sock, server ) {
        super();
        this._sock = sock;
        this._server = server;
    }

    /**
     * Getter for the underlying session socket
     *
     * @type {net.Socket}
     */
    get sock () { return this._sock; }

    /**
     * Getter for the server
     *
     * @type {SockhopServer}
     */
    get server () { return this._server; }

    /**
     * init_complete getter
     *
     * NOTE : this will be true if the client is in compatibility mode and connected, since no handshake is expected
     *
     * @return {boolean} init_complete is the client still expecting to run more initialization steps (e.g. handshake)
     */
    get init_complete() {
        return this._sock._init_complete;
    }


    get debug() {
        return this._server._debug;
    }

    /**
     * binary_mode getter
     * @return {object} binary_mode the current binary mode status
     * @return {boolean} binary_mode.rx true if we are receiving in binary mode
     * @return {boolean} binary_mode.tx true if we are transmitting in binary mode
     */
    get binary_mode() {
        return { ...this._socket.binary_mode };
    }

    /**
     * handshake_successful getter
     *
     * NOTE : this will be false if the handshake has not yet completed, or if the client is in compatibility mode
     *
     * @return {boolean} handshake_successful whether or not the last handshake was successful
     */
    get handshake_successful() {
        return this._sock._handshake_successful;
    }

    _trigger_handshake_emit(sucess, error) {
        this.emit("handshake", sucess, error);
    }

    _trigger_receive_emit(obj, meta) {
        this.emit("receive", obj, meta);
    }


    _trigger_debug_received_emit(obj, buffer, binary_mode) {
        this.emit("debug:received", obj, buffer, binary_mode);
    }

    _trigger_debug_sending_emit(obj, buffer, binary_mode) {
        this.emit("debug:sending", obj, buffer, binary_mode);
    }

    _trigger_binary_mode_emit(dir, value) {
        this.emit("binary_mode:"+dir, value);
    }

    _trigger_disconnect_emit(previously_handshaked) {
        this.emit("disconnect", previously_handshaked);
        if ( previously_handshaked ) {
            this.emit("unhandshake");
        }
    }

    /**
     * Send a message over this session
     *
     * @private
     * @param {object} obj
     * @throws {SockhopError}
     * @returns {Promise} resolves on send
     */
    async _send_message(message) {
        return this.server._send_message(this.sock, message);
    }

    /**
     * Send a message over this session
     *
     * @param {object} obj
     * @throws {SockhopError}
     * @returns {Promise} resolves on send
     */
    async send(obj) {
        return this.server.send(this.sock, obj);
    }

    /**
     * Kill this session
     *
     * @return {Promise} resolves on socket end
     */
    async kill() {
        return this.server.kill_socket(this.sock);
    }

    /**
     * Start this session
     *
     * Override me to do any setup of the session.
     *
     * I get called internally by the SockhopServer immediately after
     * a new client connects to the server, before the server emits the
     * 'connect' event. (before even the socket gets registered in the
     * server's `server._sockets` list).
     *
     * @virtual
     * @return {Promise} resolves when setup is complete
     */
    async start() {}

    /**
     * End this session
     *
     * Override me to do any teardown of the session
     *
     * I get called internally by the SockhopServer immediately after
     * the client's socket emits the 'end' event, and when I resolve, I
     * then trigger the server to emit the 'disconnect' event.
     *
     * @virtual
     * @return {Promise} resolves when teardown is complete
     */
    async end() {}

    /**
     * Construct and start a session
     *
     * This is an internal method used by SockhopServer
     * to construct and start a session, you probably shouldn't
     * change me unless you REALLY know what you are doing.
     *
     * @private
     * @param {net.Socket} sock the socket object
     * @param {SockhopServer} server a reference to the SockhopServer
     * @return {Promise<SockhopSession>} a promise resolving to a new session, which has been started
     */
    static _from_socket( sock, server ) {
        let sess = new this( sock, server );
        return sess.start().then(()=>sess);
    }
}

module.exports = exports = SockhopSession;

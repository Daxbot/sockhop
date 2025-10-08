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
 *          to proactively send any data, so that the send logic can depending on a know handshake state.
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

    /**
     * Send a message over this session
     *
     * @private
     * @param {object} obj
     * @throws {SockhopError}
     * @returns {Promise} resolves on send
     */
    _send_message(message) {
        return this.server._send_message(this.sock, message);
    }

    /**
     * Send a message over this session
     *
     * @param {object} obj
     * @throws {SockhopError}
     * @returns {Promise} resolves on send
     */
    send(obj) {
        return this.server.send(this.sock, obj);
    }

    /**
     * Kill this session
     *
     * @return {Promise} resolves on socket end
     */
    kill() {
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

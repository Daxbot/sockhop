const { EventEmitter } = require("events");

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
     * @return {net.Socket}
     */
    get sock () { return this._sock; }

    /**
     * Getter for the server
     *
     * @return {SockhopServer}
     */
    get server () { return this._server; }

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

const { EventEmitter } = require("events");

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
    get sock () { return this._sock }

    /**
     * Getter for the server
     *
     * @return {SockhopServer}
     */
    get server () { return this._server }

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
     * Override me to do any setup of the session, which happens immediately
     * after a new socket connects to the server
     *
     * @virtual
     * @return {Promise} resolves when setup is complete
     */
    async start() {}

    /**
     * End this session
     *
     * Override me to do any teardown of the session, which happens immediately
     * after a socket emits the "disconnect" event
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
     * change me. . . 
     *
     * @param {net.Socket} sock the socket object
     * @param {SockhopServer} server a reference to the SockhopServer
     * @return {Promise<SockhopSession>} a promise resolving to a new session, which has been started
     */
    static from_socket( sock, server ) {
        let sess = new this( sock, server );
        return sess.start().then(()=>sess);
    }
}

module.exports = exports = SockhopSession;

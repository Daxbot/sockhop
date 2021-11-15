const { EventEmitter } = require("events");

class SockhopSession extends EventEmitter {
    /**
     * Constructor
     *
     * By default, I don't do anything.
     *
     * @param {net.Socket} sock the socket object
     * @param {SockhopServer} server a reference to the SockhopServer
     */
    constructor( sock, server ) { super() }

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

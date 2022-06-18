
/**
 * Custom sockhop errors
 *
 * Error types, should only change with major versions
 *   - ERR_MULTICONNECT : attempting to call connect while a socket is already connecting
 *   - ERR_SOCKET_DESTROYED : attempting to interact with a destroyed socket
 *   - ERR_REMOTE_CALLBACK_TYPE : attempting to use remote callbacks with wrong message types, or not a callback function
 *   - ERR_NO_SOCKET : attempting to send a message with no socket
 *   - ERR_BAD_DATA : attempting to send a message with no data payload
 *   - ERR_OBJECTBUFFER_BAD_BUFFER : attempting to do a buffer operation with a non-buffer
 *   - ERR_OBJECTBUFFER_BAD_BUFFER_DATA : attempting to do a buffer operation with bad data in the buffer
 *   - ERR_OBJECTBUFFER_BAD_OBJECT : attempting to do an object operation with a non-serializable object
 *
 * @extends Error
 */
class SockhopError extends Error {
    /**
     * Constructs a new SockhopError
     *
     * @param {string} message A message string describing the error
     * @param {string} code A standardized code for filtering error types
     */
    constructor ( message, code ) {
        super(message);
        this.code = code;
    }
}


module.exports = exports = SockhopError;

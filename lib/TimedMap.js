
function setNullableTimeout(cb, timeout) {
    if ( timeout === null ) return timeout;
    return setTimeout(cb, timeout);
}

/**
 * A timed map object
 *
 * This is a wrapper around a map, which keeps a timer going to automatically
 * remove values that have been present for too long.
 */
class TimedMap {
    /**
     * Constructor
     *
     * @param {object} [opts] an object containing configuration options
     * @param {number} [opts.timeout] the length of time in ms that this map should hold values by default, set to `null` for no timeout (note, this is memory-leak hazard).
     */
    constructor({ timeout=30000 }={}) {
        this._map = new Map();
        this._timeout = timeout;
    }

    /**
     * Insert a new value
     *
     * @param {*} key
     * @param {*} value
     * @param {?function} cb - callback for when the value is returned, giving you the reason. Signature: `(reason) => {}`
     * @param {?number} [timeout=undefined] set to `null` to set no timeout, set to `undefined` for default time
     */
    set(key, value, cb=()=>{}, timeout=undefined) {
        const obj = this._map.get(key);
        if ( obj ) {
            clearTimeout(obj[1]);
            obj[2]("overwritten");
        }
        return this._map.set(key, [
            value,
            setNullableTimeout(() => {
                cb("timed-out");
                this._map.delete(key);
            }, timeout!==undefined?timeout:this._timeout),
            cb
        ]);
    }

    /**
     * Pop an element out of the map
     *
     * @param {*} key
     */
    extract(key) {
        const obj = this._map.get(key);
        if ( !obj ) return obj[0];

        clearTimeout(obj[1]);
        this._map.delete(key);
        return obj[0];
    }


    /**
     * Remove all values, also trigger the callback
     */
    stop() {
        for ( const [key, obj] of this._map ) {
            clearTimeout(obj[1]);
            obj[2]("stopped");
            this._map.delete(key);
        }
    }
}

module.exports = exports = TimedMap;


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
     * @param {number} [opts.timeout] the length of time in ms that this map should hold values by default
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
     * @param {?number} [timeout=undefined]
     */
    set(key, value, cb=()=>{}, timeout=undefined) {
        let obj = this._map.get(key);
        if ( obj ) {
            clearTimeout(obj[1]);
            obj[2]("overwritten");
        }
        return this._map.set(key, [
            value,
            setTimeout(() => {
                cb("timed-out");
                this._map.delete(key);
            }, timeout?timeout:this._timeout),
            cb
        ]);
    }

    /**
     * Get a value
     *
     * @param {*} key
     * @returns {*}
     */
    get(key) {
        let obj = this._map.get(key);
        return obj ? obj[0] : obj;
    }

    /**
     * Remove a value, also trigger the callback
     *
     * @param {*} key
     */
    delete(key) {
        let obj = this._map.get(key);
        if ( obj ) {
            clearTimeout(obj[1]);
            obj[2]("deleted");
        }
        return this._map.delete(key);
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

const { EventEmitter } = require("events");

const SockhopError = require("./SockhopError.js");

/**
 * Object Buffer for JSON encoding
 *
 * de/serialize objects to/from a Buffer
 *
 * Automatically reassembles fragmented buffers (useful when the buffer passes through
 * a socket, for example, and is received in pieces) and gives you your object back
 * @extends EventEmitter
 */
class JSONObjectBuffer extends EventEmitter{

    /**
      * Constructs a new JSONObjectBuffer
      *
      * @param {object} opts the options
      * @param {(string|array)} [opts.terminator="\n"] the terminator to signal the end of a JSON object. If an array is given, the first element is a receive (buf2obj) terminator and the second is the transmit (obj2buf) element
     * @param {boolean} [opts.allow_non_objects=false] allow non objects in buf2obj (will be passed through as Strings)
      * @return {JSONObjectBuffer}
      */
    constructor(opts={}){

        super();
        this._buffer=null;
        this._allow_non_objects=(opts.allow_non_objects===true)?true:false;
        if(Array.isArray(opts.terminator)) {

            this._rx_terminator=opts.terminator[0];
            this._tx_terminator=opts.terminator[1];

        } else if (typeof(opts.terminator)=="string") {

            this._tx_terminator=opts.terminator;
            this._rx_terminator=opts.terminator;

        } else {

            this._tx_terminator="\n";
            this._rx_terminator="\n";
        }
    }

    /**
      * buf2obj
      *
      * Convert a Buffer into one or more objects
      * @param {Buffer} buffer the buffer to read (we may modify or store it!)
      * @return {Array} found the objects we found
      */
    buf2obj(buf) {

        let objects=[];

        if(!Buffer.isBuffer(buf)) {

            this.emit("error", new SockhopError("buf2obj called with non buffer object", "ERR_OBJECTBUFFER_BAD_BUFFER"));
        }

        // Store the new data in this._buffer (or just reference the new buffer)
        this._buffer=(this._buffer && this._buffer.length)?Buffer.concat([this._buffer,buf],this._buffer.length+buf.length):buf;

        // Find any sequences ending in _terminator  and convert them to objects
        let start=0;
        let end=this._buffer.indexOf(this._rx_terminator);
        while(end>-1) {

            try {

                objects.push(JSON.parse(this._buffer.toString('utf8',start,end)));

            } catch(e) {

                if(this._allow_non_objects) {

                    objects.push(this._buffer.toString('utf8',start,end));

                } else {

                    this.emit("error", new SockhopError("Skipping corrupted data in buffer", "ERR_OBJECTBUFFER_BAD_BUFFER_DATA"));

                }
            }

            // Start is now the next character after the terminator
            start=end+this._rx_terminator.length;

            // Look for another end
            end=this._buffer.indexOf(this._rx_terminator,start);
        }

        if(start==this._buffer.length){

            // We have used up the whole buffer, so now it should be discarded
            this._buffer=null;

        } else if (start>0 && end==-1){

            // We have stripped out some objects and have data remaining
            let buf=Buffer.allocUnsafe(this._buffer.length-start);
            this._buffer.copy(buf,0,start);
            this._buffer=buf;

        } else if (start==0 && end==-1){

            // We never found anything.  Just return.

        } else {

            this.emit(new SockhopError("Unexplained buffer error", "ERR_OBJECTBUFFER_BAD_BUFFER_DATA"));
        }

        return objects;
    }



    /**
      * obj2buf
      *
      * Convert an Object to a Buffer
      * @param {Object} object the object to convert
      * @param {Buffer} buffer the buffer representing that object
      */
    obj2buf(obj){

        if(this._allow_non_objects===false && typeof(obj)!="object") {

            this.emit("error", new SockhopError("obj2buf called with non object type (set allow_non_objects if you want this behavior)", "ERR_OBJECTBUFFER_BAD_OBJECT"));
            return;
        }

        return Buffer.from(JSON.stringify(obj)+this._tx_terminator);
    }

}


module.exports=exports=JSONObjectBuffer;

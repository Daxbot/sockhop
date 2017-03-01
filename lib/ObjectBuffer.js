var EventEmitter=require("events").EventEmitter;


/**
 * Object Buffer
 *
 * de/serialize objects to/from a Buffer 
 * Automatically reassembles fragmented buffers (useful when the buffer passes through 
 * a socket, for example, and is received in pieces) and gives you your object back
 * @extends EventEmitter
 */
 class ObjectBuffer extends EventEmitter{


 	constructor(opts={}){

 		super();
 		this._buffer=null;
 		this._terminator=opts.terminator||"\n";
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

			this.emit("error", new Error("buf2obj called with non buffer object"));
 		}

 		// Store the new data in this._buffer (or just reference the new buffer)
 		this._buffer=(this._buffer && this._buffer.length)?Buffer.concat([this._buffer,buf],this._buffer.length+buf.length):buf;

 		// Find any sequences ending in _terminator  and convert them to objects
 		var start=0;
	 	var end=this._buffer.indexOf(this._terminator);
	 	while(end>-1) {

			try {

				objects.push(JSON.parse(this._buffer.toString('utf8',start,end)));

			} catch(e) {

				this.emit("error", new Error("Skipping corrupted data in buffer"));
			}	

			// Start is now the next character after the terminator
			start=end+this._terminator.length; 		

			// Look for another end
		 	end=this._buffer.indexOf(this._terminator,start);
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

	 		throw new Error("Unexplained buffer error");
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

 		return Buffer.from(JSON.stringify(obj)+this._terminator);
 	}

 }


 module.exports=exports=ObjectBuffer;
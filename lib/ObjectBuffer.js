const { EventEmitter } = require("events");

const { Schema } = require("obj2buf");

const SockhopError = require("./SockhopError.js");

class SockhopMessageSchema {
    constructor(name, msg_id, schema) {
        this.name = name;
        this.msg_id = msg_id;
        this.schema = schema;
    }

    toJSON() {
        return {
            name: this.name,
            msg_id: this.msg_id,
            schema: this.schema.to_json()
        }
    }

    static from_json(j) {
        return new SockhopMessageSchema(j.name, j.msg_id, Schema.from_json(j.schema));
    }

}

class SockhopMessageSchemas {
    constructor(schemas=[]) {
        this.schemas = schemas;
    }

    add(schema) {
        this.schemas.push(schema);
    }

    toJSON() {
        return this.schemas.map( s => s.toJSON() );
    }

    static from_json(j) {
        return new SockhopMessageSchemas(j.map( s => SockhopMessageSchema.from_json(s) ));
    }
}

/**
 * Object Buffer for  encoding
 *
 * de/serialize objects to/from a Buffer
 *
 * Automatically reassembles fragmented buffers (useful when the buffer passes through
 * a socket, for example, and is received in pieces) and gives you your object back
 * @extends EventEmitter
 */
class ObjectBuffer extends EventEmitter{
    static schemas_json = [
        {
            name: "sockhop:json",
            msg_id: 10,
            schema: {
                root_type: {
                    type: "MapType",
                    field_pairs: [
                        [
                            "type",
                            {
                                type: "VarStringType",
                                // max_length: 2**16-1
                                max_length: 2**8-1
                            }
                        ],
                        [
                            "data",
                            {
                                type: "JSONType",
                                max_length: 2**32-1
                            }
                        ]
                    ]
                }
            }
        },
        {
            name: "sockhop:json:callback:request",
            msg_id: 11,
            schema: {
                root_type: {
                    type: "MapType",
                    field_pairs: [
                        [
                            "type",
                            {
                                type: "VarStringType",
                                // max_length: 2**16-1
                                max_length: 2**8-1
                            }
                        ],
                        [
                            "data",
                            {
                                type: "JSONType",
                                max_length: 2**32-1
                            }
                        ],
                        [
                            "callback_id", // UUIDv4
                            {
                                type: "FixedStringType",
                                length: 36
                            }
                        ]
                    ]
                }
            }
        },
        {
            name: "sockhop:json:callback:response",
            msg_id: 12,
            schema: {
                root_type: {
                    type: "MapType",
                    field_pairs: [
                        [
                            "type",
                            {
                                type: "VarStringType",
                                // max_length: 2**16-1
                                max_length: 2**8-1
                            }
                        ],
                        [
                            "data",
                            {
                                type: "JSONType",
                                max_length: 2**32-1
                            }
                        ],
                        [
                            "callback_id", // UUIDv4
                            {
                                type: "FixedStringType",
                                length: 36
                            }
                        ],
                    ]
                }
            }
        },
        {
            name: "sockhop:buffer",
            msg_id: 13,
            schema: {
                root_type: {
                    type: "MapType",
                    field_pairs: [
                        [
                            "type",
                            {
                                type: "VarStringType",
                                // max_length: 2**16-1
                                max_length: 2**8-1
                            }
                        ],
                        [
                            "data",
                            {
                                type: "VarBufferType",
                                max_length: 2**32-1
                            }
                        ]
                    ]
                }
            }
        },
        {
            name: "sockhop:buffer:callback:request",
            msg_id: 14,
            schema: {
                root_type: {
                    type: "MapType",
                    field_pairs: [
                        [
                            "type",
                            {
                                type: "VarStringType",
                                // max_length: 2**16-1
                                max_length: 2**8-1
                            }
                        ],
                        [
                            "data",
                            {
                                type: "VarBufferType",
                                max_length: 2**32-1
                            }
                        ],
                        [
                            "callback_id", // UUIDv4
                            {
                                type: "FixedStringType",
                                length: 36
                            }
                        ]
                    ]
                }
            }
        },
        {
            name: "sockhop:buffer:callback:response",
            msg_id: 15,
            schema: {
                root_type: {
                    type: "MapType",
                    field_pairs: [
                        [
                            "type",
                            {
                                type: "VarStringType",
                                // max_length: 2**16-1
                                max_length: 2**8-1
                            }
                        ],
                        [
                            "data",
                            {
                                type: "VarBufferType",
                                max_length: 2**32-1
                            }
                        ],
                        [
                            "callback_id", // UUIDv4
                            {
                                type: "FixedStringType",
                                length: 36
                            }
                        ],
                    ]
                }
            }
        }
    ]

    /**
      * Constructs a new ObjectBuffer
      *
      * @param {object} opts the options
      * @return {ObjectBuffer}
      */
    constructor(opts={}){

        super();
        this._buffer=null;

        this.schemas = SockhopMessageSchemas.from_json(this.constructor.schemas_json);
        this._schemas_by_id = new Map(this.schemas.schemas.map( s => [s.msg_id, s] ));
        this._schemas_by_name = new Map(this.schemas.schemas.map( s => [s.name, s] ));

        // TODO : long term, we will want to split this into an rx/tx, and have both
        //        be settable, then bake into the handshake process a way to negotiate
        this._msg_id_bytes = 1; // uin8t
        this._msg_id_parser = "readUInt8";
        this._msg_id_writer = "writeUInt8";
        this._length_bytes = 4; // uint32
        this._length_parser = "readUInt32LE";
        this._length_writer = "writeUInt32LE";
        this._header_length = this._msg_id_bytes + this._length_bytes;
    }

    /**
      * buf2obj
      *
      * Convert a Buffer into one or more objects
      * @param {Buffer} buffer the buffer to read (we may modify or store it!)
      * @return {Array} found the objects we found
      */
    buf2obj(buf, {return_buffers=false}={}) {


        if(!Buffer.isBuffer(buf)) {

            this.emit("error", new SockhopError("buf2obj called with non buffer object", "ERR_OBJECTBUFFER_BAD_BUFFER"));
        }


        // Store the new data in this._buffer (or just reference the new buffer)
        this._buffer=(this._buffer && this._buffer.length)?Buffer.concat([this._buffer,buf],this._buffer.length+buf.length):buf;

        const objects=[];
        while ( this._buffer.length >= this._header_length ) {
            // We have enough data to read the length and msg_id
            const length = this._buffer[this._length_parser](0);
            if ( length > this._buffer.length - this._header_length ) {
                // Not enough data yet
                break;
            }

            const msg_id = this._buffer[this._msg_id_parser](this._length_bytes);
            const schema = this._schemas_by_id.get(msg_id);
            if ( !schema ) {
                this.emit("error", new SockhopError(`No schema for message id ${msg_id}`, "ERR_OBJECTBUFFER_NO_SCHEMA"));
                // Remove this message from the buffer
                this._buffer = this._buffer.slice(this._header_length + length);
                continue;
            }

            try {
                const buf = this._buffer.slice(this._header_length, this._header_length + length);
                const obj = schema.schema.deserialize(buf);
                objects.push({
                    msg_id,
                    name:schema.name,
                    obj: obj,
                    buffer: return_buffers ? buf : undefined
                });
            } catch(e) {
                this.emit("error", new SockhopError(`Failed to deserialize message id ${msg_id} as ${schema.name}: ${e.message}`, "ERR_OBJECTBUFFER_DESERIALIZE_FAILED"));
            }

            // Remove this message from the buffer
            this._buffer = this._buffer.slice(this._header_length + length);
        }

        return objects;
    }



    /**
      * obj2buf
      *
      * Convert an Object to a Buffer
      * @param {string} name the name of the schema to use
      * @param {Object} object the object to convert
      * @param {Buffer} buffer the buffer representing that object
      */
    obj2buf(name, obj){

        const schema = this._schemas_by_name.get(name);
        if ( !schema ) {
            this.emit("error", new SockhopError(`No schema for name ${name}`, "ERR_OBJECTBUFFER_NO_SCHEMA"));
            return;
        }

        try {
            const payload_length = schema.schema.calculate_byte_length(obj);
            const buffer = Buffer.alloc(this._header_length + payload_length);
            buffer[this._length_writer](payload_length, 0);
            buffer[this._msg_id_writer](schema.msg_id, this._length_bytes);
            schema.schema.encode(obj, buffer, this._header_length);
            return buffer;
        } catch(e) {
            this.emit("error", new SockhopError(`Failed to serialize object as ${name}: ${e.message}`, "ERR_OBJECTBUFFER_SERIALIZE_FAILED"));
            return;
        }
    }

}


module.exports=exports=ObjectBuffer;

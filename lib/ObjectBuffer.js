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
    static internal_schemas_json = [
        {
            name: "sockhop:json",
            msg_id: 0,
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
            msg_id: 1,
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
            msg_id: 2,
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
        this._last_msg_id = 60; // reserve messagse 0-59 for system use

        this.rx_schemas = SockhopMessageSchemas.from_json(this.constructor.internal_schemas_json);
        this._rx_schemas_by_id = new Map(this.rx_schemas.schemas.map( s => [s.msg_id, s] ));

        this.tx_schemas = SockhopMessageSchemas.from_json(this.constructor.internal_schemas_json);
        this._tx_schemas_by_name = new Map(this.tx_schemas.schemas.map( s => [s.name, s] ));
    }

    add_rx_schema(name, schema, { msg_id }={}) {
        if ( this._rx_schemas_by_id.size >= 65535 ) {
            this.emit("error", new SockhopError("Maximum number of schemas reached", "ERR_OBJECTBUFFER_MAX_SCHEMAS"));
            return;
        }
        for ( const s of this._rx_schemas_by_id.values() ) {
            if ( s.name === name ) {
                this.emit("error", new SockhopError(`Schema with name ${name} already exists`, "ERR_OBJECTBUFFER_SCHEMA_EXISTS"));
                return;
            }
        }

        let s;
        try {
            s = Schema.from_json(schema);
        } catch(e) {
            this.emit("error", new SockhopError(`Schema with name ${name} is invalid: ${e.message}`, "ERR_OBJECTBUFFER_SCHEMA_INVALID"));
            return;
        }

        if (msg_id==null) msg_id = this._last_msg_id++;
        const sms = new SockhopMessageSchema(name, msg_id, s);
        this._rx_schemas_by_id.set(msg_id, sms);
        this.rx_schemas.add(sms);
        this.emit("rx_schema_added", sms);
    }


    has_tx_schema(name) {
        return this._tx_schemas_by_name.has(name);
    }

    clear_tx_schemas() {
        this._tx_schemas_by_name.clear();
    }

    add_tx_schema(msg_id, name, schema) {

        if ( this._tx_schemas_by_name.size >= 65535 ) {
            this.emit("error", new SockhopError("Maximum number of schemas reached", "ERR_OBJECTBUFFER_MAX_SCHEMAS"));
            return;
        }
        if ( this._tx_schemas_by_name.has(name) ) {
            this.emit("error", new SockhopError(`Schema with name ${name} already exists`, "ERR_OBJECTBUFFER_SCHEMA_EXISTS"));
            return;
        }

        let s;
        try {
            s = Schema.from_json(schema);
        } catch(e) {
            this.emit("error", new SockhopError(`Schema with name ${name} is invalid: ${e.message}`, "ERR_OBJECTBUFFER_SCHEMA_INVALID"));
            return;
        }

        const sms = new SockhopMessageSchema(name, msg_id, s);
        this._tx_schemas_by_name.set(name, sms);
        this.tx_schemas.add(sms);
        this.emit("tx_schema_added", sms);
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
        while ( this._buffer.length >= 4 + 2 ) {

            const length = this._buffer.readUInt32LE(0);
            if ( length > this._buffer.length - 4 - 2 ) {
                // Not enough data yet
                break;
            }

            const msg_id = this._buffer.readUInt16LE(4);
            const schema = this._rx_schemas_by_id.get(msg_id);
            if ( !schema ) {
                this.emit("error", new SockhopError(`No schema for message id ${msg_id}`, "ERR_OBJECTBUFFER_NO_SCHEMA"));
                // Remove this message from the buffer
                this._buffer = this._buffer.slice(4 + 2 + length);
                continue;
            }

            try {
                const buf = this._buffer.slice(4 + 2, 4 + 2 + length);
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
            this._buffer = this._buffer.slice(4 + 2 + length);
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

        const schema = this._tx_schemas_by_name.get(name);
        if ( !schema ) {
            this.emit("error", new SockhopError(`No schema for name ${name}`, "ERR_OBJECTBUFFER_NO_SCHEMA"));
            return;
        }

        try {
            const payload_length = schema.schema.calculate_byte_length(obj);
            const buffer = Buffer.alloc(4 + 2 + payload_length);
            buffer.writeUInt32LE(payload_length, 0);
            buffer.writeUInt16LE(schema.msg_id, 4);
            schema.schema.encode(obj, buffer, 4 + 2);
            return buffer;
        } catch(e) {
            this.emit("error", new SockhopError(`Failed to serialize object as ${name}: ${e.message}`, "ERR_OBJECTBUFFER_SERIALIZE_FAILED"));
            return;
        }
    }

}


module.exports=exports=ObjectBuffer;

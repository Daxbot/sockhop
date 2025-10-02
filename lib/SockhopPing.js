const { randomUUID: uuidv4 } = require("crypto");

/**
 * TCP Ping
 *
 * Used internally when .ping() is called
 */
class SockhopPing {

    constructor(o={}){

        this._id=o._id||uuidv4();
        this._created=o._created||new Date();
        this._returned=o._returned||null;
        this._finished=o._finished||null;
    }

    /**
     * Unanswered
     *
     * Is this ping Unanswered?
     * @return {boolean}
     */
    unanswered(){

        return (this._finished===null)?true:false;
    }

    /**
     * Conclude a ping
     *
     * Sets the returned, finished values
     * @param {SockhopPong} pong the pong (ping reply) that is finishing this ping
     */
    conclude_with_pong(p){

        if(p._id==this._id){

            this._returned=p._returned;
            this._finished=new Date();
            //console.log("finished: "+JSON.stringify(this));
        }
    }
}

/**
 * TCP Ping reply
 *
 * Used internally when .ping() is replied
 */
class SockhopPong {

    constructor(o={}){

        this._id=o._id||null;
        this._created=o._created||null;
        this._returned=o._returned||new Date();
        this._finished=o._finished||null;
    }

    get finished(){

        return this._finished;
    }
}

module.exports = exports = {
    SockhopPing,
    SockhopPong
};

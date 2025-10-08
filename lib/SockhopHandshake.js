
const library_version = require('../package.json').version;

module.exports=exports=class SockhopHandshake {
    static protocol_version = 2;
    static library_version = library_version;

    constructor(opts={}) {
        this.protocol_version = SockhopHandshake.protocol_version;
        this.library_version = SockhopHandshake.library_version;

        this.request_binary_mode = opts.request_binary_mode || false;
    }
};

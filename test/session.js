var Sockhop=require("../index.js");
var assert=require("assert");

var c,s;

class Session extends Sockhop.Session {
    a() { return 1; }

    async start() {
        this.b = 2;
    }
    async end() {
        this.c = 3;
    }
}


describe("Session", function(){

    s=new Sockhop.Server({port: 50032, session_type: Session});
    c=new Sockhop.Client({port: 50032});

    before(async() => { await s.listen(); });
    afterEach(async() => {
        // add a little bit of buffer time to make sure the sockets get
        // cleaned up in between
        await new Promise(res => setTimeout(res, 100));
    });

    it("session is started successfully on connect",function(done){

        s.once('connect', (sock, sess) => {
            assert.equal(sess.b, 2);
            c.disconnect().then(done);
        });
        c.connect();
    });

    it("session is stopped successfully on disconnect",function(done){

        s.once('connect', () => {
            c.disconnect();
        });
        s.once('disconnect', (sock, sess) => {
            assert.equal(sess.c, 3);
            done();
        });
        c.connect();
    });

    it("session can carry methods",function(done){

        s.once('connect', (sock, sess) => {
            assert.equal(sess.a(), 1);
            c.disconnect().then(done);
        });
        c.connect();
    });

    it("session can store state information",function(done){

        s.once('connect', (sock, sess) => {
            sess.d = 4;
            c.send("any old message");
        }).once('receive', (sock, meta) => {
            assert.equal(meta.session.d, 4);
            c.disconnect().then(done);
        });
        c.connect();
    });

});


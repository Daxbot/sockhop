var Sockhop=require("../index.js");
var assert=require("assert");

var c,s;

describe("Client-server", function(){

    s=new Sockhop.server({port: 50002, response_timeout:50});
    c=new Sockhop.client({port: 50002, response_timeout:50});

    before(async() => { await s.listen(); });

    it("client.connected transitions from false to true on connect",function(done){

        assert.equal(c.connected,false);
        c.connect()
            .then(()=>{

                assert.equal(c.connected, true);
                done();
            });
    });
    it("client.connect returns if connected",function(done){
        c.connect()
            .then(()=>done());
    });
    it("client.connected transitions from true to false on disconnect",function(done){

        assert.equal(c.connected,true);
        c.disconnect()
            .then(()=>{

                assert.equal(c.connected, false);
                done();
            });
    });
    it("client.send return error when not connected to server",function(done){
        c.send("data").catch(()=>{
            done();
        });
    });

    it("client allows reconnect after disconnect", function(done){
        c.connect()
            .then(()=>done());
    });


    it("client.send()", function(done){

        c.connect()
            .then(()=>{

                s.once("receive", (msg)=>{
                    assert.equal(msg, "data goes in");
                    done();
                });

                c.send("data goes in");
            });

    });

    it("client.request()", function(done){

        c.connect()
            .then(()=>{

                s.once("request", (req,res)=>{
                    assert.equal(req.data, "data goes in");
                    res.send("and goes out");
                });

                c.request("data goes in").then(s => {
                    return s.next();
                }).then(res => {
                    assert.equal(res.data, "and goes out");
                    done();
                });
            });

    });

    it("client.request() times out from no response", function(done){

        c.connect()
            .then(()=>{
                c.request("data goes in").then(s => {
                    s.once("end", (err) => {
                        assert.equal(err.code, "ERR_RESPONSE_TIMEOUT");
                        done();
                    });
                });
            });

    });

    it("client.request() times out from no end", function(done){

        c.connect()
            .then(()=>{
                s.once("request", (req,res)=>{
                    assert.equal(req.data, "data goes in");
                    res.write("and goes out"); // NO END
                });
                c.request("data goes in").then(s => {
                    s.once("end", (err) => {
                        assert.equal(err.code, "ERR_RESPONSE_TIMEOUT");
                        done();
                    });
                    s.once("data", (data) => {
                        assert.equal(data, "and goes out");
                    });
                });
            });

    });

    it("client.request() can extend timeouts", function(done){

        c.connect()
            .then(()=>{
                s.once("request", (req,res)=>{
                    assert.equal(req.data, "data goes in");
                    // End after a little while
                    (new Promise(res => setTimeout(res, 100))).then(() => {
                        res.send("and goes out");
                    });
                });

                c.request("data goes in", { timeout: 200 }).then(s => {
                    return s.next();
                }).then(res => {
                    assert.equal(res.data, "and goes out");
                    done();
                });
            });

    });


    it("Cannot to request 'send' respond twice", function(done){

        c.connect()
            .then(()=>{

                s.once("request", (req,res)=>{
                    assert.equal(req.data, "data goes in");
                    res.send("and goes out").then(() => {
                        res.send("but not twice").catch(err => {
                            assert.equal(err.code, "ERR_RESPONSE_SEND");
                            done();
                        });
                    });
                });

                c.request("data goes in");
            });
    });

    it("Can stream multiple packets", function(done){

        c.connect()
            .then(()=>{
                s.once("request", (req,res)=>{
                    assert.equal(req.data, "data goes in");
                    res.write("and goes out");
                    res.write("and goes out again");
                    res.end();
                });

                c.request("data goes in").then(s => s.all()).then((pkt_array) => {
                    assert.equal(pkt_array.length, 3);
                    assert.equal(pkt_array[0].data, "and goes out");
                    assert.equal(pkt_array[1].data, "and goes out again");
                    done();
                });
            });
    });

    it("server.sendall()", function(done){

        c.once("receive", (msg)=>{

            assert.equal(msg, "data goeth in");
            done();
        });

        s.sendall("data goeth in");

    });

    it("server.request()", function(done){

        s.once("connect", (sock) => {
            c.once("request", (req,res)=>{
                assert.equal(req.data, "data goes in");
                res.send("and goes out");
            });

            s.request(sock,"data goes in").then(s => s.next()).then(res => {
                assert.equal(res.data, "and goes out");
                done();
            });
        });
        // Force the disconnection so that the above triggers
        c.disconnect().then(() => {
            c.connect();
        });
    });

    it("session.send()", function(done){

        s.once("connect", (sock, sess) => {
            c.once("receive", (data)=>{
                assert.equal(data, "data goes in");
                done();
            });

            sess.send("data goes in");
        });
        // Force the disconnection so that the above triggers
        c.disconnect().then(() => {
            c.connect();
        });
    });

    it("session.request()", function(done){

        s.once("connect", (sock, sess) => {
            c.once("request", (req,res)=>{
                assert.equal(req.data, "data goes in");
                res.send("and goes out");
            });

            sess.request("data goes in").then(s => s.next()).then(res => {
                assert.equal(res.data, "and goes out");
                done();
            });
        });
        // Force the disconnection so that the above triggers
        c.disconnect().then(() => {
            c.connect();
        });
    });


    it("client.send() with remote triggered callback", function(done){

        s.once("receive", (msg, meta)=>{
            assert.equal(msg, "Promise to call when you get this");
            meta.callback("I got it!");
        });

        c.send("Promise to call when you get this", (reply)=>{

            assert.equal(reply, "I got it!");
            done();
        });

    });

    it("server.send() with remote triggered callback", function(done){

        c.once("receive", (msg, meta)=>{
            assert.equal(msg, "Please RSVP to the server");
            meta.callback("RSVP");
        });

        s.send(s.sockets[0], "Please RSVP to the server", (reply)=>{

            assert.equal(reply, "RSVP");
            done();
        });

    });
    after("close server",()=>{

        s.close();
    });
});



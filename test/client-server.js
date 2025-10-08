var Sockhop=require("../index.js");
var assert=require("assert");

var c,s;

describe("Client-server", function(){

    s=new Sockhop.server({port: 51002, response_timeout:50});
    c=new Sockhop.client({port: 51002, response_timeout:50});

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

    it("server.sendall()", function(done){

        c.once("receive", (msg)=>{

            assert.equal(msg, "data goeth in");
            done();
        });

        s.sendall("data goeth in");

    });

    it("session.send()", function(done){

        // Force the disconnection so that the above triggers
        c.disconnect().then(() => {
            return new Promise((res)=>setTimeout(res,100));
        }).then(() => {
            s.once("connect", (sock, sess) => {
                c.once("receive", (data)=>{
                    assert.equal(data, "data goes in");
                    done();
                });

                sess.send("data goes in");
            });
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



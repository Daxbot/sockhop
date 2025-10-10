var Sockhop=require("../index.js");

var c,s;

describe("Events", function(){

    s=new Sockhop.Server({port: 50003});
    c=new Sockhop.Client({port: 50003});

    it("server.on('connect')", function(done){

        s.once("connect",()=>done())
            .listen()
            .then(()=>c.connect());
    });

    it("server.on('disconnect')", function(done){

        s.once("disconnect",()=>done());
        c.disconnect();
    });

    it("client.on('connect')", function(done){

        c.once("connect",()=>done());
        c.connect();
    });

    it("client.on('disconnect')", function(done){

        c.once("disconnect",()=>done());
        s.disconnect();
    });

    after("close server",()=>{

        s.close();
    });

});


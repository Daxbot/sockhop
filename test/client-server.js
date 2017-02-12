var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("Client-server", function(){

	s=new Sockhop.server({port: 50002});
	c=new Sockhop.client({port: 50002});

	it("client.send()", function(done){

		s.listen()
			.then(()=>c.connect())
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

	it("client reconnect after disconnect", function(done){

		c.disconnect()
			.then(()=>c.connect())
			.then(()=>done());
	});
});










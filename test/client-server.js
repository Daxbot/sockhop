var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("Client-server", function(){

	s=new Sockhop.server({port: 50002});
	c=new Sockhop.client({port: 50002});

	it("client.connected transitions from false to true on connect",function(done){

		assert.equal(c.connected,false);
		s.listen()
		.then(()=>c.connect())
		.then(()=>{

			assert.equal(c.connected, true);
			done();
		});
	});
	it("client.connected transitions from true to false on disconnect",function(done){

		assert.equal(c.connected,true);
		c.disconnect()
		.then(()=>{

			assert.equal(c.connected, false);
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


});










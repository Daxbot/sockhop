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
		c.send("data").catch((e)=>{
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
});










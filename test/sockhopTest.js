var Sockhop=require("../sockhop.js");
var assert=require("assert");

var c,s,m;

describe("Server",()=>{

	// Spawn server
	s=new Sockhop.server();
	it("spawn",()=>{

		return s.listen();
	});

	it("get_bound_address()", ()=>{

		assert.equal(s.get_bound_address(),"127.0.0.1");
	});

});

describe("Client",()=>{

	// Spawn client
	c=new Sockhop.client();
	it("connect", function(){

		return c.connect();
	});

	it("get_bound_address()", ()=>{

		assert.equal(c.get_bound_address(),"127.0.0.1");
	});

});

describe("Client-server", function(){

	it("client.send()", function(done){

		s.on("receive", (msg)=>{

			assert.equal(msg, "data goes in");
			s.removeAllListeners("receive");
			done();
		});

		c.send("data goes in");

	});

	it("server.sendall()", function(done){

		c.on("receive", (msg)=>{

			assert.equal(msg, "data goeth in");
			c.removeAllListeners("receive");
			done();
		});

		s.sendall("data goeth in");

	});
});

describe("Events", function(){

	it("server.on('disconnect')", function(done){

		s.on("disconnect",()=>{

			s.removeAllListeners("disconnect");
			done();
		});

		c.disconnect();
	});


	it("client.on('disconnect')", function(done){

		c.on("disconnect",()=>{

			c.removeAllListeners("disconnect");
			done();
		});

		c.connect().then(()=>{

			s.disconnect();
		});

	});

});

describe("Server ping", function(){

	it("Server disconnects paused client (should be slow)", function(done){

		s.on("disconnect",()=>{

			s.removeAllListeners("disconnect");
			s.ping(0);
			done();
		});

		c.connect().then(()=>{
			s.ping(200);
			c.socket.pause();
		});

	});

	it("Client disconnects paused server (should be slow)", function(done){

		c=new Sockhop.client();
		c.on("disconnect",()=>{

			done();
		})
		c.connect().then(()=>{

			c.ping(200);
			s.sockets.map((s)=>s.pause());
		});


	});

});








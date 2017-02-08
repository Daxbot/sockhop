var Sockhop=require("../index.js");
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

	it("Handle ECONNREFUSED",(done)=>{

		let cc=new Sockhop.client({port: 49999});
		cc.connect().catch((e)=>{

			assert(e.errno.match(/ECONNREFUSED/));
			done();
		});


	});

});

describe("Client-server", function(){

	it("client.send()", function(done){

		s.once("receive", (msg)=>{

			assert.equal(msg, "data goes in");
			done();
		});

		c.send("data goes in");

	});

	it("server.sendall()", function(done){

		c.once("receive", (msg)=>{

			assert.equal(msg, "data goeth in");
			done();
		});

		s.sendall("data goeth in");

	});
});

describe("Events", function(){

	it("server.on('disconnect')", function(done){

		s.once("disconnect",()=>{

			done();
		});

		c.disconnect();
	});


	it("client.on('disconnect')", function(done){

		c.once("disconnect",()=>{

			done();
		});

		c.connect().then(()=>{

			s.disconnect();
		});

	});

});

describe("Ping", function(){

	this.slow(3000);

	it("Client pings server successfully for 1000ms", function(done){

		s.once("disconnect",()=>{

			throw new Error("Server has disconnected unexpectedly");
		});

		c.connect().then(()=>{
			c.ping(200);		// Ping at 200ms intervals

			setTimeout(()=>{	// Let it ping for 1000ms, then cleanly disconnect

				s.removeAllListeners("disconnect");
				c.disconnect();
				done();
			}, 1000);

		});

	});


	it("Server disconnects paused client (should be slow)", function(done){

		s.once("disconnect",()=>{

			s.ping(0);
			done();
		});

		c=new Sockhop.client();
		c.connect().then(()=>{

			s.ping(200);
			c.socket.pause();
		});

	});

	it("Client disconnects paused server (should be slow)", function(done){

		c=new Sockhop.client();
		c.once("disconnect",()=>{

			s.disconnect();
			done();
		})
		c.connect().then(()=>{

			c.ping(200);
			s.sockets.map((s)=>s.pause());
		});


	});

	this.slow(10000);

	it("Client reconnects on disconnect (should be slow)", function(done){

		s=new Sockhop.server({port: 50001});
		s2=new Sockhop.server({port: 50002});

		c=new Sockhop.client({port: 50001});
		// Set up disconnect event to reconnect
		c.once("disconnect",()=>{

			// We now set up an event handler so we are done when we reconnect (to a different server, actually, so we can do it fast)
			c.port=50002;
			c.once("connect",()=>{

				done();
			});

			// // Attempt to reconnect client in 500ms (allow socket to release)
			// setTimeout(()=>{

			c.connect();				
			// },3500);
		});

		s.listen()
			.then(()=>{
				
				return s2.listen();
			})
			.then(()=>{

				return c.connect();
			})
			.then(()=>{

				// Ping from client while pausing server (causes disconnect)
				c.ping(200, true);
				s.sockets.map((s)=>s.pause());

			});


	});


});








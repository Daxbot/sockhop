var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;


describe("Ping", function(){

	this.slow(3000);
	s=new Sockhop.server({port: 50004});
	c=new Sockhop.client({port: 50004});

	it("Client pings server successfully for 500ms", function(done){

		s.listen()
		.then(()=>c.connect())
		.then(()=>{

			s.once("disconnect",()=>{

				throw new Error("Server has disconnected unexpectedly");
			});

			c.ping(100);		// Ping at 100ms intervals

			setTimeout(()=>{	// Let it ping for 500ms, then done

				s.removeAllListeners("disconnect");
				done();

			}, 500);

		});
	});

	it("Simultaneous ping client<-->server for 500ms", function(done){

		s.once("disconnect",()=>{

			throw new Error("Server has disconnected unexpectedly");
		})
		.ping(100);		// Ping at 100ms intervals

		setTimeout(()=>{	// Let it ping for 500ms, then disconnect client and done

			s.removeAllListeners("disconnect");
			s.ping(0);
			c.disconnect();
			done();

		}, 500);
	});

	it("Server disconnects paused client (should be slow)", function(done){

		// c.on("error",(e)=>{

		// 	console.log("CLIENT THREW!!!");
		// });

		// We are done once disconnect fires
		s.once("disconnect",()=>{

			s.ping(0);
			done();
		});

		// Connect and then pause the socket
		c.connect().then(()=>{

			s.ping(200);
			c.socket.pause();	// Should cause the server to kill us
		});

	});

	it("Client disconnects paused server (should be slow)", function(done){

		c=new Sockhop.client({port: 50004});
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

		s=new Sockhop.server({port: 50005});
		s2=new Sockhop.server({port: 50006});

		c=new Sockhop.client({port: 50005});
		// Set up disconnect event to reconnect
		c.once("disconnect",()=>{

			// We now set up an event handler so we are done when we reconnect (to a different server, actually, so we can do it fast)
			c.port=50006;
			c.once("connect",()=>{

				done();
			});

			c.connect();				
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








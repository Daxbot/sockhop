var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("client.auto_reconnect", function(){


	s=new Sockhop.server({port: 50007});
	c=new Sockhop.client({port: 50007, auto_reconnect_interval: 200});

	it("Will cause connect", function(done){

		// We are done once we connect and pass data
		c.once("connect",()=>{

			s.once("receive", (msg)=>{
				assert.equal(msg, "Here, have some data");
				done();
			});

			c.send("Here, have some data");
		});

		s.listen()
		.then(()=>c.auto_reconnect=true);

	});

	it("Reconnects automatically when client disconnects due to ping (slow)", function(done){

		this.slow(3000);

		// We are done once we connect and xfer data
		c.once("connect",()=>{

			s.once("receive", (msg)=>{
				assert.equal(msg, "data goes in");
				done();
			});

			c.send("data goes in");
		});
		c.ping(200);
		c.socket.pause();	// Drop the wrench into the engine

	});



	it("Reconnects on server death, only bubble single disconnect event", function(done){
	
		this.slow(3000);

		// Count disconnect events
		var disconnect_event_counter=0;
		c.on("disconnect",()=>{

			disconnect_event_counter++;
		});

		// We are done once we connect
		c.once("connect",()=>{

			assert.equal(disconnect_event_counter,1);
			done();
		});

		Promise.resolve()
		.then(()=>s.close())
		.then(()=>{

				delete s;	// jshint ignore:line
		})
		.then(()=>{


			// 1s later, create a new server
			setTimeout(()=>{
				s=new Sockhop.server({port: 50007});
				s.listen();
			},1000);
		});

	});


});










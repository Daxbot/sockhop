var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("client.auto_reconnect", function(){


	s=new Sockhop.server({port: 50007});
	c=new Sockhop.client({port: 50007, auto_reconnect_interval: 200});

	it("Will cause connect", function(done){

		// We are done once we connect
		c.once("connect",()=>done());

		s.listen()
		.then(()=>c.auto_reconnect=true);

	});

	it("Reconnects automatically when client disconnects", function(done){

		// We are done once we connect
		c.once("connect",()=>done());

		c.disconnect();

	});

	it("Reconnects automatically when server disconnects (slow)", function(done){
	
		this.slow(3000);

		// We are done once we connect
		c.once("connect",()=>done());

		s.close()
		.then(()=>{

			setTimeout(()=>{

				s.listen();
			},500);
		});

	});

});










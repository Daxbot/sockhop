var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("Events", function(){

	s=new Sockhop.server({port: 50003});
	c=new Sockhop.client({port: 50003});

	it("server.on('disconnect') fires when client disconnects", function(done){

		s.listen()
		.then(()=>c.connect())
		.then(()=>{
			
			s.once("disconnect",()=>done());
			c.disconnect();
		});
	});

	it("client.on('disconnect') fires when server disconnects", function(done){

		c.once("disconnect",()=>done());
		c.connect().then(()=>s.disconnect());
	});

});


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

	it("Send data client => server", function(done){

		s.on("receive", (msg)=>{

			assert.equal(msg, "data goes in");
			done();
		});

		c.send("data goes in");

	});

});
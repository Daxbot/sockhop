var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("Unix domain sockets", function(){

	// Pick a random socket path 
	let socket_name=`/tmp/sockhop${Math.random()*100000}`;

	// Unix path setting overrides IP address and port.  When we connect, we set a port number so this test will fail if the unix socket does not work.  Otherwise defaults may prevail and the test passes.
	s=new Sockhop.server({path: socket_name, port: 4999});
	c=new Sockhop.client({path: socket_name, port: 4888});



	it("client.send()", function(done){

		s.listen()
		.then(()=>c.connect())
		.then(()=>{

			s.once("receive", (msg)=>{
				assert.equal(msg, "data goes in");
				done();
			});

			c.send("data goes in")
			.then(()=>c.disconnect());
		});

	});

	after("close server",()=>{

		s.close();
	});
});










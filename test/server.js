var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,m;

describe("Server",()=>{

	// Spawn server
	s=new Sockhop.server({port: 50001});
	it("listen()",()=>{

		return s.listen();
	});

	it("get_bound_address()", ()=>{

		assert.equal(s.get_bound_address(),"127.0.0.1");
	});

	it("close()",()=>{

		s.close();
	});

	it("listen() again",()=>{

		return s.listen()
			.then(()=>{

				s.close();
			});
	});

});


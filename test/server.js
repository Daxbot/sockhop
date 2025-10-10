var Sockhop=require("../index.js");
var assert=require("assert");

var s;

describe("Server",()=>{

    // Spawn server
    s=new Sockhop.Server({port: 50001});
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


    it("Server slam open/close does not throw uncaught errors", function(done){

        let x=new Sockhop.Server({port: 50008});

        x.listen().then(()=>x.close()).then(()=>done());
    });

    after(("close server"),()=>{

        s.close();

    });

});


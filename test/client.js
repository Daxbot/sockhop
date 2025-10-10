var Sockhop=require("../index.js");
var assert=require("assert");

var c,s;

describe("Client",()=>{

    s=new Sockhop.Server({port: 50000});
    c=new Sockhop.Client({port: 50000});

    it("connect()", function(){

        return s.listen()
            .then(()=>c.connect());
    });

    it("get_bound_address()", ()=>{

        assert.equal(c.get_bound_address(),"127.0.0.1");
    });

    it("Handle ECONNREFUSED",(done)=>{

        let cc=new Sockhop.Client({port: 49999});
        cc.connect().catch((e)=>{

            assert(e.message.match(/ECONNREFUSED/));
            done();
        });

    });

    it("disconnect()", ()=>{

        return c.disconnect();
    });

    it("connect() again", ()=>{

        return c.connect()
            .then(()=>c.disconnect())
            .then(()=>{

                return Promise.resolve();
            });
    });

    after(("close servers"),()=>{

        s.close();

    });
});

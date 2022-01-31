var Sockhop=require("../index.js");
var assert=require("assert");

var c,s,c2;

var large_data_size=1024*1024*1;    // n MB
var very_large_buffer=Buffer.alloc(large_data_size);
for (let n=0; n< large_data_size; n++){

    very_large_buffer[n]='X';
}


// If this fails it will throw an Error 'Skipping corrupted data in buffer'
describe("Server multiplexing", function(){

    this.slow(3000);

    s=new Sockhop.server({port: 50008});
    c=new Sockhop.client({port: 50008});
    c2=new Sockhop.client({port: 50008});

    it("Sibling client data doesn't collide in server", function(done){

        s.listen()
            .then(()=>c.connect())
            .then(()=>c2.connect())
            .then(()=>{

                let received_payloads=0;

                s.on("receive", (msg)=>{

                    if(msg.type=="large"){

                        assert.equal(msg.my_data.length, large_data_size);

                    } else if (msg.type=="small") {

                        assert.equal(msg.my_data.length, 9);

                    }

                    received_payloads++;

                    // console.log(`... received ${received_payloads}/${payload_count}`);

                    // Check to see if we have received both payloads
                    if(received_payloads==2) {

                        c.disconnect();
                        s.close();
                        done();
                    }
                });


                c.send({ "type": "large", "my_data" : very_large_buffer.toString('utf8')});
                c2.send({ "type": "small", "my_data" : "YYYYYYYYY"});

            });

    });

});










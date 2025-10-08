var Sockhop=require("../index.js");
var assert=require("assert");
const expect=require("chai").expect;

var c,s,c2;

var large_data_size=1024*1024*1;    // n MB
var very_large_buffer=Buffer.alloc(large_data_size);
for (let n=0; n< large_data_size; n++){

    very_large_buffer[n]='X';
}


// If this fails it will throw an Error 'Skipping corrupted data in buffer'
describe("Server multiplexing", function(){

    it("Sibling client data doesn't collide in server (compatibility mode)", function(done){
        const s=new Sockhop.server({port: 50008, compatibility_mode: true});
        const c=new Sockhop.client({port: 50008, compatibility_mode: true});
        const c2=new Sockhop.client({port: 50008, compatibility_mode: true});

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

    it("Sibling client data doesn't collide in server", async function(){
        const s=new Sockhop.server({port: 50308});
        const c=new Sockhop.client({port: 50308});
        const c2=new Sockhop.client({port: 50308});

        await s.listen();
        await Promise.all([c.connect(), c2.connect()]);

        const promise = new Promise((resolve, reject) => {
            let got_large=false;
            let got_small=false;
            s.on("receive", (msg)=>{

                if(msg.type=="large"){
                    try {
                        expect(msg.my_data.length, "Large Data got mangled").to.equal(large_data_size);
                    } catch(err) {
                        return reject(err);
                    }
                    got_large=true;
                } else if (msg.type=="small") {
                    try {
                        expect(msg.my_data.length, "Small Data got mangled").to.equal(9);
                    } catch(err) {
                        return reject(err);
                    }
                    got_small=true;
                }

                if(got_large&&got_small) resolve();
            });
        });

        c.send({ "type": "large", "my_data" : very_large_buffer.toString('utf8')});
        c2.send({ "type": "small", "my_data" : "YYYYYYYYY"});

        await promise;
        await Promise.all([c.disconnect(), c2.disconnect(), s.close()]);
    });

});










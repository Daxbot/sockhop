var Sockhop=require("../index.js");
var assert=require("assert");
var spawn=require("child_process").spawn;


var c,s;

describe("Reconnections", function(){


    s=new Sockhop.server({port: 50007});
    c=new Sockhop.client({port: 50007, auto_reconnect_interval: 200});

    before(async() => s.listen());
    after(async() => s.close());
    beforeEach(async() => c.start());
    afterEach(async() => c.disconnect());

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
        c.socket.pause();    // Drop the wrench into the engine

    });



    it("Reconnects on server death, only bubble single disconnect event", function(done){

        this.slow(3000);

        // Count disconnect events
        var disconnect_event_counter=0;
        c.on("disconnect",()=>{

            disconnect_event_counter++;
        });

        // We are done shortly after we connect
        c.once("connect",()=>{

            assert.equal(disconnect_event_counter,1);
            done();
        });

        Promise.resolve()
            .then(()=>s.close())
            .then(()=>{
            // 1s later, create a new server
                setTimeout(()=>{
                    s=new Sockhop.server({port: 50007});
                    s.listen();
                },500);
            });

    });


    it("Attempts connect until server appears, then bubbles SINGLE connect event (slow)", function(done){

        this.slow(4000);
        this.timeout(3000);


        c.disconnect();
        c=new Sockhop.client({port: 50009, auto_reconnect_interval: 200});

        // Count connect events
        let connect_event_counter=0;

        // Name the counter function so we can remove it later
        let connect_counter_fn=function(){

            connect_event_counter++;
        };

        c.on("connect",connect_counter_fn);

        // We are done shortly after we connect
        c.once("connect",()=>{
            setTimeout(()=>{

                // Make sure we only got one event
                assert.equal(connect_event_counter,1);

                // Clean up connect events
                c.removeListener("connect", connect_counter_fn);

                // Disconnect, and we are done
                c.disconnect().then(()=>done());
            },500);
        });

        // Start trying to connect
        c.start();

        Promise.resolve()
            .then(()=>{

                // After 1s pause, create a new server
                setTimeout(()=>{

                    s=new Sockhop.server({port: 50009});
                    s.listen();

                },1000);

            });

    });

    it("Setting auto_reconnect to false cleans up the internal interval", function(done){

        c.auto_reconnect=false;
        assert.equal(c._auto_reconnect_timer, null, "Timer is still active");
        done();

    });

    it("Server violent death (2x), client reconnects and bubbles 2 connect events (slow)", function(done){

        this.slow(9000);
        this.timeout(9000);

        // Create a fresh client
        c.disconnect();
        c=new Sockhop.client({port: 50010, auto_reconnect_interval: 200});

        // Count connect events, start recording connect events
        let connect_event_counter=0;
        c.on("connect",()=>{

            connect_event_counter++;
        });


        // Start the server
        let slambang=spawn("node", ["./slambang.js"]); // eslint-disable-line no-unused-vars
        // slambang.stdout.on("data",(data)=>console.log("data:"+data));
        // slambang.stderr.on("data",(data)=>console.log("err:"+data));

        // Ignore any connection errors
        c.on("error",()=>{});

        // We are done shortly after we connect, then disconnect, then reconnect again
        c.once("connect", () =>{
            c.once("disconnect", ()=>{

                // We have disconnected.  Wait 500ms, then restart server
                setTimeout(()=>{

                    let slambang=spawn("node", ["./slambang.js"]); // eslint-disable-line no-unused-vars
                    // slambang.stdout.on("data",(data)=>console.log("data:"+data));
                    // slambang.stderr.on("data",(data)=>console.log("err:"+data));
                },500);

                c.once("connect", ()=>{

                    setTimeout(()=>{

                        // Make sure we only got one event
                        assert.equal(connect_event_counter,2);

                        // Done
                        done();
                    },500);

                });
            });
        });

        // Connect the client
        c.start();

    });

});










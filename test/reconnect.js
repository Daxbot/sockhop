var Sockhop=require("../index.js");
var assert=require("assert");
var spawn=require("child_process").spawn;
const { expect } = require("chai");


var c,s;

describe("client.auto_reconnect", function(){


    s=new Sockhop.Server({port: 50007});
    c=new Sockhop.Client({port: 50007, auto_reconnect_interval: 200, auto_reconnect: true });

    it("Will throw to prevent deprecated use", function(done){
        s.listen()
            .then(()=>c.auto_reconnect=true)
            .catch((err) => {
                assert.equal(err.message, "Auto-reconnect setter has been disabled for SockhopClient");
                done();
            });

    });


    it("Reconnects automatically when client disconnects due to ping (slow)", function(done){

        this.timeout(5000);

        c.connect().then(() => {
            c.ping(200);
            c.socket.pause();    // Drop the wrench into the engine
            c.once("disconnect",()=>{ // We should disconnect
                c.once("connect",()=>{ // We should reconnect

                    s.once("receive", (msg)=>{
                        assert.equal(msg, "data goes in");
                        c.ping(0);
                        done();
                    });

                    c.send("data goes in");
                });
            });
        });

    });



    it("Reconnects on server death, only bubble single disconnect event", function(done){

        this.timeout(5000);

        // Count disconnect events
        var disconnect_event_counter=0;
        c.on("disconnect",()=>{

            disconnect_event_counter++;
        });

        // We are done shortly after we connect
        c.once("connect",()=>{

            assert.equal(disconnect_event_counter,1);
            c.disconnect();
            s.close();
            delete c; // eslint-disable-line no-delete-var
            delete s; // eslint-disable-line no-delete-var
            done();
        });

        Promise.resolve()
            .then(()=>s.close())
            .then(()=>{
                delete s; // eslint-disable-line no-delete-var
            })
            .then(()=>{
            // 1s later, create a new server
                setTimeout(()=>{
                    s=new Sockhop.Server({port: 50007});
                    s.listen();
                },500);
            });

    });


    it("Server violent death (2x), client doesn't reconnects (if not configured to do so) and bubbles 1 connect events (slow)", function(done){

        this.timeout(9000);

        // Create a fresh client
        c=new Sockhop.Client({port: 50010, auto_reconnect_interval: 200});

        // Count connect events, start recording connect events
        let connect_event_counter=0;
        c.on("connect",()=>{

            connect_event_counter++;
        });


        // Start the server
        let slambang=spawn("node", ["./slambang.js", 2000]); // eslint-disable-line no-unused-vars
        // slambang.stdout.on("data",(data)=>console.log("data:"+data));
        // slambang.stderr.on("data",(data)=>console.log("err:"+data));

        // Ignore any connection errors
        c.on("error",()=>{});

        // We are done shortly after we connect, then disconnect, then reconnect again
        c.once("connect", () =>{
            c.once("disconnect", ()=>{

                // We have disconnected.  Wait 500ms, then restart server
                setTimeout(()=>{

                    let slambang=spawn("node", ["./slambang.js", 3000]); // eslint-disable-line no-unused-vars
                    // slambang.stdout.on("data",(data)=>console.log("data:"+data));
                    // slambang.stderr.on("data",(data)=>console.log("err:"+data));
                },500);

                // Wait until the client *should* have reconnected (but won't)
                setTimeout(()=>{

                    // Make sure we only got one event
                    assert.equal(connect_event_counter,1);

                    // Done
                    c.disconnect();
                    done();
                },2000);

            });
        });

        // Connect the client, a bit delayed to allow slambang to start
        setTimeout(()=>{
            c.connect();
        },500);

    });

    it("Server violent death (2x), client reconnects and bubbles 2 connect events (slow)", function(done){

        this.slow(9000);
        this.timeout(9000);

        // Create a fresh client
        c=new Sockhop.Client({port: 50010, auto_reconnect_interval: 200, auto_reconnect: true });

        // Count connect events, start recording connect events
        let connect_event_counter=0;
        c.on("connect",()=>{

            connect_event_counter++;
        });


        // Start the server
        let slambang=spawn("node", ["./slambang.js", 2000]); // eslint-disable-line no-unused-vars
        // slambang.stdout.on("data",(data)=>console.log("data:"+data));
        // slambang.stderr.on("data",(data)=>console.log("err:"+data));

        // Ignore any connection errors
        c.on("error",()=>{});

        // We are done shortly after we connect, then disconnect, then reconnect again
        c.once("connect", () =>{
            c.once("disconnect", ()=>{

                // We have disconnected.  Wait 500ms, then restart server
                setTimeout(()=>{

                    let slambang=spawn("node", ["./slambang.js", 3000]); // eslint-disable-line no-unused-vars
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

        // Connect the client, a bit delayed to allow slambang to start
        setTimeout(()=>{
            c.connect();
        },500);

    });

    after(("closeup"),()=>{

        if(c.connected) c.disconnect();
        s.close();

    });
});



let BASE_PORT=51130;
describe("client.auto_rehandshake", function(){
    let s,c;

    beforeEach(async() => {
        let port=BASE_PORT++;
        s=new Sockhop.Server({port: port});
        c=new Sockhop.Client({port: port, auto_rehandshake_interval:200, auto_rehandshake: true });
        await s.listen();
    });
    afterEach(async() => {
        await Promise.all([
            s.close(),
            c.disconnect(),
        ]);
        await new Promise(r=>setTimeout(r,10));
    });

    it("Will throw if calling connect()", async function(){
        try {
            await c.connect();
        } catch(err) {
            expect(err.message).to.equal("You configured `auto_rehandshake=true`, and so almost certainly want `.start()` not `.connect()` if you think you know otherwise, use `._connect()`");
            return;
        }
        throw new Error("Should have thrown");
    });

    it("Will rehandshake automatically if server drops us", async function(){

        let sock=null;
        s.on("connect", (s, sess) => {
            sock=s;
        });

        await c.start();

        expect(c.connected, "Client not initially connected when should be").to.be.true;
        expect(c.handshake_successful, "Client handshake failed when should have succeeded").to.be.true;

        let got_unhandshake=false;
        c.on("unhandshake", () => {
            got_unhandshake=true;
        });

        let got_rehandshake=false;
        c.on("handshake", () => {
            got_rehandshake=true;
        });

        sock.destroy(); // induce a server-side hang-up

        // Wait for events to propagate, and reconnect to happen
        await new Promise(resolve => setTimeout(resolve, 500));

        expect(got_unhandshake, "Client never got unhandshake event").to.be.true;
        expect(got_rehandshake, "Client never rehandshaked").to.be.true;

    });
});







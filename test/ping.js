var Sockhop=require("../index.js");
const expect=require("chai").expect;

var c,s,s2;

let BASE_PORT=52580;
const HANDSHAKE_TIMEOUT=200;


for ( const { server_compatibility_mode, client_compatibility_mode } of [
    { server_compatibility_mode: false, client_compatibility_mode: false },
    { server_compatibility_mode: true, client_compatibility_mode: false },
    { server_compatibility_mode: false, client_compatibility_mode: true },
    { server_compatibility_mode: true, client_compatibility_mode: true },
] ) {

    describe(`Ping (server_compatibility_mode=${server_compatibility_mode}, client_compatibility_mode=${client_compatibility_mode})`, function(){

        it("Client pings server successfully for 1000ms", async function(){
            let port=BASE_PORT++;
            const s=new Sockhop.Server({port: port, compatibility_mode: server_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});
            const c=new Sockhop.Client({port: port, compatibility_mode: client_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});

            try {
                await s.listen();
                await c.connect();

                // Setup disconnect listener
                let disconnected = false;
                s.once("disconnect",()=>{
                    disconnected = true;
                });

                c.ping(100);   // Ping at 100ms intervals

                await new Promise(r => setTimeout(r, 1000)); // Let it ping for 1000ms (plenty of time for multiple pings)

                expect(disconnected).to.be.false; // Ensure server did not disconnect

            } finally {
                await s.close();
                await c.disconnect();
                await new Promise(r=>setTimeout(r,100));
            }

        });

        it("Simultaneous ping client<-->server for 1000ms", async function(){

            let port=BASE_PORT++;
            const s=new Sockhop.Server({port: port, compatibility_mode: server_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});
            const c=new Sockhop.Client({port: port, compatibility_mode: client_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});

            try {
                await s.listen();
                await c.connect();

                // Setup disconnect listener
                let client_disconnected = false;
                s.once("disconnect",()=>{
                    client_disconnected = true;
                });

                let server_disconnected = false;
                c.once("disconnect",()=>{
                    server_disconnected = true;
                });

                c.ping(100);   // Ping at 100ms intervals
                s.ping(100);   // Ping at 100ms intervals

                await new Promise(r => setTimeout(r, 1000)); // Let it ping for 1000ms (plenty of time for multiple pings)

                expect(client_disconnected,"Client disconnected from server").to.be.false; // Ensure server did not disconnect
                expect(server_disconnected,"Server disconnected from client").to.be.false; // Ensure client did not disconnect

            } finally {
                await s.close();
                await c.disconnect();
                await new Promise(r=>setTimeout(r,100));
            }
        });

        it("Server disconnects paused client from ping-out", async function(){

            let port=BASE_PORT++;
            const s=new Sockhop.Server({port: port, compatibility_mode: server_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});
            const c=new Sockhop.Client({port: port, compatibility_mode: client_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});

            try {
                await s.listen();
                await c.connect();


                let disconnected = false;
                s.once("disconnect",() => {
                    disconnected = true;
                });

                s.ping(100);
                c.socket.pause();    // Should cause the server to kill us

                await new Promise(r => setTimeout(r, 1000)); // Wait to be disconnected

                expect(disconnected).to.be.true; // Ensure server disconnected

            } finally {
                await s.close();
                await c.disconnect();
                await new Promise(r=>setTimeout(r,100));
            }
        });

        it("Client disconnects paused client from ping-out", async function(){
            this.timeout(10000);

            let port=BASE_PORT++;
            const s=new Sockhop.Server({port: port, compatibility_mode: server_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});
            const c=new Sockhop.Client({port: port, compatibility_mode: client_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});

            try {
                await s.listen();
                await c.connect();


                let disconnected = false;
                c.once("disconnect",() => {
                    disconnected = true;
                });

                c.ping(100);
                s.sockets.map((s)=>s.pause()); // Should cause the client to kill us

                await new Promise(r => setTimeout(r, 1000)); // Wait to be disconnected

                expect(disconnected).to.be.true; // Ensure server disconnected

            } finally {
                await s.close();
                await c.disconnect();
                await new Promise(r=>setTimeout(r,100));
            }
        });

        it("Client can reconnect elsewhere after ping-ing-out from server", async function(){
            this.timeout(10000);

            let port=BASE_PORT++;
            let port2=BASE_PORT++;
            const s=new Sockhop.Server({port: port, compatibility_mode: server_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});
            const s2=new Sockhop.Server({port: port2, compatibility_mode: server_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});
            const c=new Sockhop.Client({port: port, compatibility_mode: client_compatibility_mode, handshake_timeout: HANDSHAKE_TIMEOUT});

            try {
                await s.listen();
                await s2.listen();
                await c.connect();


                let disconnected = false;
                c.once("disconnect",() => {
                    disconnected = true;

                    c.ping(0);
                    c.port=port2;
                    c._end_socket();
                    c.connect();
                });

                let reconnected = false;
                c.once("connect",() => {
                    reconnected = true;
                });

                c.ping(100);
                s.sockets.map((s)=>s.pause()); // Should cause the client to kill us

                await new Promise(r => setTimeout(r, 1000)); // Wait to be disconnected

                expect(disconnected).to.be.true; // Ensure server disconnected
                expect(reconnected).to.be.true; // Ensure we reconnected

            } finally {
                await s.close();
                await c.disconnect();
                await new Promise(r=>setTimeout(r,100));
            }
        });

    });

}

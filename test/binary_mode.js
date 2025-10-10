var Sockhop=require("../index.js");
const expect=require("chai").expect;

let BASE_PORT=52000;
const HANDSHAKE_TIMEOUT=200;


describe(`Binary mode`, function(){

    let c,s;
    beforeEach(async function(){
        let port=BASE_PORT++;
        s=new Sockhop.Server({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});
        c=new Sockhop.Client({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});
        await s.listen();
    });

    afterEach(async function(){
        await s.close();
        await c.disconnect();
    });


    it("Handshake does not use binary mode", async function(){

        let server_send_count=0;
        let server_binary_mode=false;
        s.once("debug:sending",(data,buffer,binary_mode) => {
            server_binary_mode ||= binary_mode;
            server_send_count++;
        });

        let client_send_count=0;
        let client_binary_mode=false;
        c.once("debug:sending",(data,buffer,binary_mode) => {
            client_binary_mode ||= binary_mode;
            client_send_count++;
        });

        await c.start(); // wait for handshake to complete

        expect(server_send_count, "Server did not send any data").to.be.greaterThan(0);
        expect(client_send_count, "Client did not send any data").to.be.greaterThan(0);
        expect(server_binary_mode, "Server entered binary before handshake completed").to.be.false;
        expect(client_binary_mode, "Client entered binary before handshake completed").to.be.false;

    });

    it("Enters binary mode (tx) after handshake", async function(){
        let sock;
        s.on("connect", (s) => { sock=s; });
        await c.start(); // wait for handshake to complete
        // await new Promise(r => setTimeout(r, 10)); // Actually, don't wait -- binary mode should already be set before the handshake event fires

        expect(sock.binary_mode.tx, "Server-side socket no tx-ing in binary mode").to.be.true;
        expect(c.binary_mode.tx, "Client-side socket no tx-ing in binary mode").to.be.true;

    });

    it("Enters binary mode (rx) after handshake", async function(){
        let sock;
        s.on("connect", (s) => { sock=s; });
        await c.start(); // wait for handshake to complete
        await new Promise(r => setTimeout(r, 10)); // Need this wait, since rx binary mode can be set slightly after handshake event

        expect(sock.binary_mode.rx, "Server-side socket no rx-ing in binary mode").to.be.true;
        expect(c.binary_mode.rx, "Client-side socket no rx-ing in binary mode").to.be.true;

    });

    it("Binary mode tx event fires", async function(){

        let sock_binary_mode=false;
        s.on("connect", (s) => {
            s.on("binary_mode:tx",() => {
                sock_binary_mode = true;
            });
        });

        let client_binary_mode=false;
        c.on("binary_mode:tx",() => {
            client_binary_mode = true;
        });

        await c.start(); // wait for handshake to complete
        // await new Promise(r => setTimeout(r, 10)); // Actually, don't wait -- binary mode should already be set before the handshake event fires

        expect(sock_binary_mode, "Server-side socket didn't fire binary_mode:tx event").to.be.true;
        expect(client_binary_mode, "Client-side socket didn't fires binary_moode:tx event").to.be.true;

    });

    it("Binary mode tx event fires before handshake", async function(){
        return new Promise(async (resolve, reject) => {
            let sock_binary_mode=false;
            s.on("connect", (s) => {
                s.on("binary_mode:tx",() => {
                    sock_binary_mode = true;
                });
            });
            s.on("handshake", () => {
                try {
                    expect(sock_binary_mode, "Server-side socket didn't fire binary_mode:tx event before handshake").to.be.true;
                }catch(e){ return reject(e); }
            });

            let client_binary_mode=false;
            c.on("binary_mode:tx",() => {
                client_binary_mode = true;
            });
            c.on("handshake", () => {
                try {
                    expect(client_binary_mode, "Client-side socket didn't fires binary_moode:tx event before handshake").to.be.true;
                }catch(e){ return reject(e); }
            });

            await c.start(); // wait for handshake to complete

            await new Promise(r => setTimeout(r, 10)); // Wait for all callbacks to fire

            resolve();
        });

    });

    it("Binary mode rx event fires", async function(){

        let sock_binary_mode=false;
        s.on("connect", (s) => {
            s.on("binary_mode:rx",() => {
                sock_binary_mode = true;
            });
        });

        let client_binary_mode=false;
        c.on("binary_mode:rx",() => {
            client_binary_mode = true;
        });

        await c.start(); // wait for handshake to complete
        await new Promise(r => setTimeout(r, 10)); // Need this wait, since rx binary mode can be set slightly after handshake event

        expect(sock_binary_mode, "Server-side socket didn't fire binary_mode:rx event").to.be.true;
        expect(client_binary_mode, "Client-side socket didn't fires binary_moode:rx event").to.be.true;

    });


    it("Server rx's in binary mode after handshake", async function(){
        let sock;
        s.on("connect", (s) => { sock=s; });
        await c.start(); // wait for handshake to complete


        let server_send_count=0;
        let server_binary_mode=false;
        s.once("debug:sending",(data,buffer,binary_mode) => {
            server_binary_mode ||= binary_mode;
            server_send_count++;
        });

        c.on("receive", (obj, meta) => {
            // ignore
        });
        await s.send(sock, "test");

        expect(server_send_count, "Server did not send any data").to.be.greaterThan(0);
        expect(server_binary_mode, "Server did not entered binary").to.be.true;

    });

    it("Client rx's in binary mode after handshake", async function(){
        await c.start(); // wait for handshake to complete


        let client_send_count=0;
        let client_binary_mode=false;
        c.once("debug:sending",(data,buffer,binary_mode) => {
            client_binary_mode ||= binary_mode;
            client_send_count++;
        });

        s.on("receive", (obj, meta) => {
            // ignore
        });
        await c.send("test");

        expect(client_send_count, "Client did not send any data").to.be.greaterThan(0);
        expect(client_binary_mode, "Client did not entered binary").to.be.true;

    });

    it("Client switches packets to binary smoothly", async function(){
        // Without this sleep, the test sometimees fails for an unknown reason
        // Possibly some weird interaction with the debug event listeners?
        await new Promise(r => setTimeout(r, 200));

        let ever_not_binary=false;
        let ever_binary=false;
        let packets_got=0;
        s.on("debug:received", (msg, buffer, binary_mode) => {
            if ( msg.type == "String" && msg.data.split(" ")[0] == "ping" ) {
                ever_not_binary ||= !binary_mode;
                ever_binary ||= binary_mode;
                packets_got++;
                // console.log("Server", binary_mode, msg.data.split(" ")[1], packets_got);
            }
        });
        let packets_sent=0;
        c.on("debug:sending", (msg, buffer, binary_mode) => {
            if ( msg.type == "String" && msg.data.split(" ")[0] == "ping" ) {
                packets_sent++;
                // console.log("client", binary_mode, msg.data.split(" ")[1], packets_sent);
            }
        });

        // Spam pings to simulate lots of data pushing through during handshake
        await c.connect(); // connect but do not complete handshake
        let idx = 1;
        const timer = setInterval(() => {
            // Incrementing idx only on successful send, so we can compare easily with what ends up on the server
            c.send("ping "+idx).then(() => idx++).catch(()=>{});
        }, 0);

        await new Promise(res => c.once("handshake", res));
        await new Promise(r => setTimeout(r, 50)); // wait a bit to let some pings through
        clearInterval(timer);
        await new Promise(r => setTimeout(r, 50)); // callback to let last pings through

        expect(packets_got, "Server did not receive any pings").to.be.greaterThan(0);
        expect(packets_sent, "Client sent more pings than we got -- something is bad!").to.equal(packets_got);
        expect(ever_not_binary, "Server never received non-binary pings").to.be.true;
        expect(ever_binary, "Server never received binary pings").to.be.true;
    });
});

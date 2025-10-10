var Sockhop=require("../index.js");
var assert=require("assert");
const { expect } = require("chai");

let BASE_PORT=51030;

describe("Client-server", function(){

    let s,c;

    beforeEach(async() => {
        let port=BASE_PORT++;
        s=new Sockhop.Server({port: port, response_timeout:50});
        c=new Sockhop.Client({port: port, response_timeout:50});
        await s.listen();
    });
    afterEach(async() => {
        await s.close();
        await c.disconnect();
        await new Promise(r=>setTimeout(r,10));
    });

    it("client.connected transitions from false to true on connect",async function(){
        expect(c.connected, "Client should not be connected before calling connect()").to.be.false;
        await c.connect();
        expect(c.connected, "Client should be connected after connect() resolves").to.be.true;

    });

    it("client.connect returns if connected",async function(){
        await c.connect();
        expect(c.connected, "Client should be connected after connect() resolves").to.be.true;
        let start=Date.now();
        await c.connect();
        expect(Date.now()-start, "Second connect() should return immediately if already connected").to.be.lessThan(20);
        expect(c.connected, "Client should still be connected after second connect() resolves").to.be.true;
    });

    it("client.connected transitions from true to false on disconnect",async function(){

        await c.connect();
        expect(c.connected, "Client should be connected after connect() resolves").to.be.true;
        await c.disconnect();
        expect(c.connected, "Client should not be connected after disconnect() resolves").to.be.false;
    });

    it("client.send return error when not connected to server",async function(){
        await c.connect();
        expect(c.connected, "Client should be connected after connect() resolves").to.be.true;

        await c.send("data");
    });

    it("client allows reconnect after disconnect", async function(){
        await c.connect();
        expect(c.connected, "Client should be connected after connect() resolves").to.be.true;
        await c.disconnect();
        expect(c.connected, "Client should not be connected after disconnect() resolves").to.be.false;
        await c.connect();
        expect(c.connected, "Client should be connected after second connect() resolves").to.be.true;
    });


    it("client.send() (prior to handshake)", async function(){

        // Force compatibility mode, so that no other data is sent on connect
        let port=BASE_PORT++;
        let s2=new Sockhop.Server({port: port, response_timeout:50, compatibility_mode: true});
        let c2=new Sockhop.Client({port: port, response_timeout:50, compatibility_mode: true});
        try {
            await s2.listen();

            const promise = new Promise(res => s2.once("receive", (msg, meta) => res(msg)));
            await c2.connect();
            await c2.send("data goes in");

            const value = await promise;
            expect(value, "Got the wrong data over the socket").to.equal("data goes in");
        } finally {
            await s2.close();
            await c2.disconnect();
            await new Promise(r=>setTimeout(r,10));
        }
    });

    it("client.send() (post to handshake)", async function(){

        await c.start();
        await new Promise(r=>setTimeout(r,10)); // Allow any post-handshake data to be flushed

        const promise = new Promise(res => s.once("receive", (msg, meta) => res(msg)));
        await c.send("data goes in");

        const value = await promise;
        expect(value, "Got the wrong data over the socket").to.equal("data goes in");
    });

    it("server.sendall() (prior to handshake)", async function(){

        // Force compatibility mode, so that no other data is sent on connect
        let port=BASE_PORT++;
        let s2=new Sockhop.Server({port: port, response_timeout:50, compatibility_mode: true});
        let c2=new Sockhop.Client({port: port, response_timeout:50, compatibility_mode: true});
        try {
            await s2.listen();

            const promise = new Promise(res => c2.once("receive", (msg, meta) => res(msg)));
            await c2.connect();
            await s2.sendall("data goeth in");
            const value = await promise;
            expect(value, "Got the wrong data over the socket").to.equal("data goeth in");
        } finally {
            await s2.close();
            await c2.disconnect();
            await new Promise(r=>setTimeout(r,10));
        }

    });

    it("server.sendall() (post to handshake)", async function(){

        await c.start();
        await new Promise(r=>setTimeout(r,10)); // Allow any post-handshake data to be flushed

        const promise = new Promise(res => c.once("receive", (msg, meta) => res(msg)));
        await s.sendall("data goes in");

        const value = await promise;
        expect(value, "Got the wrong data over the socket").to.equal("data goes in");
    });

    it("session.send() (prior to handshake)", async function(){

        // Force compatibility mode, so that no other data is sent on connect
        let port=BASE_PORT++;
        let s2=new Sockhop.Server({port: port, response_timeout:50, compatibility_mode: true});
        let c2=new Sockhop.Client({port: port, response_timeout:50, compatibility_mode: true});
        try {
            await s2.listen();

            const sess_promise = new Promise( r2 => s2.once("connect", (sock, s) => { r2(s); } ) );
            const promise = new Promise(res => c2.once("receive", (msg, meta) => res(msg)));

            await c2.connect();
            const sess = await sess_promise;
            await sess.send("data goeth in");
            const value = await promise;
            expect(value, "Got the wrong data over the socket").to.equal("data goeth in");
        } finally {
            await s2.close();
            await c2.disconnect();
            await new Promise(r=>setTimeout(r,10));
        }

    });

    it("session.send() (post to handshake)", async function(){

        const sess_promise = new Promise( r2 => s.once("connect", (sock, s) => { r2(s); } ) );

        await c.start();
        await new Promise(r=>setTimeout(r,10)); // Allow any post-handshake data to be flushed

        const promise = new Promise(res => c.once("receive", (msg, meta) => res(msg)));
        const sess = await sess_promise;
        await sess.send("data goes in");

        const value = await promise;
        expect(value, "Got the wrong data over the socket").to.equal("data goes in");
    });

    it("client.send() with remote triggered callback (prior to handshake)", async function(){

        // Force compatibility mode, so that no other data is sent on connect
        let port=BASE_PORT++;
        let s2=new Sockhop.Server({port: port, response_timeout:50, compatibility_mode: true});
        let c2=new Sockhop.Client({port: port, response_timeout:50, compatibility_mode: true});
        try {
            await s2.listen();

            const promise_req = new Promise(res => s2.once("receive", (msg, meta) => {
                meta.callback("got it!");
                res(msg);
            }));


            await c2.connect();
            const response = await new Promise(res => c2.send("data goeth in", res));
            const request = await promise_req;
            expect(request, "Got the wrong data over the socket").to.equal("data goeth in");
            expect(response, "Got the wrong data over the socket").to.equal("got it!");
        } finally {
            await s2.close();
            await c2.disconnect();
            await new Promise(r=>setTimeout(r,10));
        }


    });

    it("client.send() with remote triggered callback (post to handshake)", async function(){

        await c.start();
        await new Promise(r=>setTimeout(r,10)); // Allow any post-handshake data to be flushed

        const promise_req = new Promise(res => s.once("receive", (msg, meta) => {
            meta.callback("got it!");
            res(msg);
        }));
        const response = await new Promise(res => c.send("data goeth in", res));
        const request = await promise_req;
        expect(request, "Got the wrong data over the socket").to.equal("data goeth in");
        expect(response, "Got the wrong data over the socket").to.equal("got it!");

    });

    it("server.send() with remote triggered callback (prior to handshake)", async function(){

        // Force compatibility mode, so that no other data is sent on connect
        let port=BASE_PORT++;
        let s2=new Sockhop.Server({port: port, response_timeout:50, compatibility_mode: true});
        let c2=new Sockhop.Client({port: port, response_timeout:50, compatibility_mode: true});
        try {
            await s2.listen();

            const socket_promise = new Promise(r => s2.once("connect", (sock, session) => r(sock)));

            const promise_req = new Promise(res => c2.once("receive", (msg, meta) => {
                meta.callback("got it!");
                res(msg);
            }));

            await c2.connect();
            const socket = await socket_promise;
            const response = await new Promise(res => s2.send(socket, "data goeth in", res));
            const request = await promise_req;
            expect(request, "Got the wrong data over the socket").to.equal("data goeth in");
            expect(response, "Got the wrong data over the socket").to.equal("got it!");
        } finally {
            await s2.close();
            await c2.disconnect();
            await new Promise(r=>setTimeout(r,10));
        }
    });

    it("server.send() with remote triggered callback (post to handshake)", async function(){


        const socket_promise = new Promise(r => s.once("connect", (sock, session) => r(sock)));
        await c.start();
        await new Promise(r=>setTimeout(r,10)); // Allow any post-handshake data to be flushed

        const promise_req = new Promise(res => c.once("receive", (msg, meta) => {
            meta.callback("got it!");
            res(msg);
        }));
        const socket = await socket_promise;
        const response = await new Promise(res => s.send(socket, "data goeth in", res));
        const request = await promise_req;
        expect(request, "Got the wrong data over the socket").to.equal("data goeth in");
        expect(response, "Got the wrong data over the socket").to.equal("got it!");
    });
});



var Sockhop=require("../index.js");
const expect=require("chai").expect;

let BASE_PORT=52000;
const HANDSHAKE_TIMEOUT=200;


describe(`Binary mode`, function(){

    it("Handshake does not use binary mode", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.server({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});
        const c=new Sockhop.client({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});

        try {
            await s.listen();


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

        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });

    it("Enters binary mode after handshake", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.server({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});
        const c=new Sockhop.client({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});

        try {
            await s.listen();
            let sock;
            s.on("connect", (s) => { sock=s; });
            await c.start(); // wait for handshake to complete
            await new Promise(r => setTimeout(r, 10));

            expect(sock._binary_mode.rx, "Server-side socket no rx-ing in binary mode").to.be.true;
            expect(c._binary_mode.rx, "Client-side socket no rx-ing in binary mode").to.be.true;
            expect(sock._binary_mode.tx, "Server-side socket no tx-ing in binary mode").to.be.true;
            expect(c._binary_mode.tx, "Client-side socket no tx-ing in binary mode").to.be.true;

        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });

    it("Server rx's in binary mode after handshake", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.server({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});
        const c=new Sockhop.client({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});

        try {
            await s.listen();
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

        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });

    it("Client rx's in binary mode after handshake", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.server({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});
        const c=new Sockhop.client({port: port, handshake_timeout: HANDSHAKE_TIMEOUT, debug: true});

        try {
            await s.listen();
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

        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });
});

var Sockhop=require("../index.js");
const expect=require("chai").expect;


let BASE_PORT=52100;


describe(`Client Debug Mode`, function(){

    it("No debug:received event fires outside of debug mode", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.Server({port: port});
        const c=new Sockhop.Client({port: port});

        try {
            await s.listen();
            await c.connect();

            let fired = false;
            c.once("debug:received",()=>{
                fired = true;
            });

            // Ensure that the full message is received and a response is sent back
            s.on("receive", async (msg, meta) => {
                meta.callback("ok");
            });
            await new Promise(res => c.send("test", res));

            expect(fired, "Client fired debug:received when it should not have").to.be.false; // Ensure server did not disconnect

        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });

    it("No debug:sending event fires outside of debug mode", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.Server({port: port});
        const c=new Sockhop.Client({port: port});

        try {
            await s.listen();
            await c.connect();

            let fired = false;
            c.once("debug:sending",()=>{
                fired = true;
            });

            // Ensure that the full message is received and a response is sent back
            s.on("receive", async (msg, meta) => {
                meta.callback("ok");
            });
            await new Promise(res => c.send("test", res));

            expect(fired, "Client fired debug:sending when it should not have").to.be.false; // Ensure server did not disconnect

        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });

    it("debug:received is fired in debug mode", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.Server({port: port});
        const c=new Sockhop.Client({port: port, debug: true});

        try {
            await s.listen();

            c.start();
            await new Promise(res => setTimeout(res, 10)); // Wait for handshake to complete, so that we don't have any other messages in flight

            let fired = false;
            let msg, buffer;
            c.once("debug:received",(msg_, buffer_)=>{
                fired = true;
                msg = msg_;
                buffer = buffer_;
            });

            // Ensure that the full message is received and a response is sent back
            s.on("receive", async (msg, meta) => {
                meta.callback("ok");
            });
            await new Promise(res => c.send("test", res));

            expect(fired, "Client didn't fire debug:received when it should have").to.be.true; // Ensure server did not disconnect
            expect(msg).to.be.an("object");
            expect(msg.type).to.equal("String");
            expect(msg.data).to.equal("ok");
            expect(buffer).to.be.instanceOf(Buffer);
            expect(buffer.length).to.be.greaterThan(0);


        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });


    it("debug:sending is fired in debug mode by .send()", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.Server({port: port});
        const c=new Sockhop.Client({port: port, debug: true});

        try {
            await s.listen();

            c.start();
            await new Promise(res => setTimeout(res, 10)); // Wait for handshake to complete, so that we don't have any other messages in flight

            let fired = false;
            let msg, buffer;
            c.once("debug:sending",(msg_, buffer_)=>{
                fired = true;
                msg = msg_;
                buffer = buffer_;
            });

            await c.send("test");

            expect(fired, "Client didn't fire debug:sending when it should have").to.be.true; // Ensure server did not disconnect
            expect(msg).to.be.an("object");
            expect(msg.type).to.equal("String");
            expect(msg.data).to.equal("test");
            expect(buffer).to.be.instanceOf(Buffer);
            expect(buffer.length).to.be.greaterThan(0);


        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });

    it("debug:sending is fired in debug mode by callback response", async function(){
        let port=BASE_PORT++;
        const s=new Sockhop.Server({port: port});
        const c=new Sockhop.Client({port: port, debug: true});

        try {
            await s.listen();
            let sock;
            s.on("connect", (sock_) => {
                sock = sock_;
            });

            c.start();
            await new Promise(res => setTimeout(res, 10)); // Wait for handshake to complete, so that we don't have any other messages in flight

            let fired = false;
            let msg, buffer;
            c.once("debug:sending",(msg_, buffer_)=>{
                fired = true;
                msg = msg_;
                buffer = buffer_;
            });

            // Ensure that the full message is received and a response is sent back
            c.on("receive", async (msg, meta) => {
                meta.callback("ok");
            });
            await new Promise(res => s.send(sock, "test", res));

            expect(fired, "Client didn't fire debug:sending when it should have").to.be.true; // Ensure server did not disconnect
            expect(msg).to.be.an("object");
            expect(msg.type).to.equal("String");
            expect(msg.data).to.equal("ok");
            expect(buffer).to.be.instanceOf(Buffer);
            expect(buffer.length).to.be.greaterThan(0);


        } finally {
            await s.close();
            await c.disconnect();
            await new Promise(r=>setTimeout(r,100));
        }

    });
});

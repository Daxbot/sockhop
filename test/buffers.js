var Sockhop=require("../index.js");
var assert=require("assert");
var { expect } = require("chai");


let BASE_PORT=50335;

describe("Buffers", function(){

    describe("Not in binary mode", function(){
        let s,c,sess;

        beforeEach(async function(){
            const PORT=BASE_PORT++;
            s = new Sockhop.Server({port: PORT, allow_binary_mode: false, debug: true, });
            c = new Sockhop.Client({port: PORT, allow_binary_mode: false, debug: true });
            const sess_promise = new Promise(res => s.once("connect", (_,s) => res(s)));
            await s.listen();
            await c.start();
            sess = await sess_promise;
            await new Promise(res => setTimeout(res, 50)); // Let rx binary mode settle
        });

        afterEach(async function(){
            await Promise.all([
                c.disconnect(),
                s.close()
            ]);
            await new Promise(res => setTimeout(res, 100));
        });

        it("Client/Server are actually not in binary_mode",async function(){

            expect(c.binary_mode.rx, "Client rx not false").to.be.false;
            expect(c.binary_mode.tx, "Client tx not false").to.be.false;
            expect(sess.binary_mode.rx, "Server rx not false").to.be.false;
            expect(sess.binary_mode.tx, "Server tx not false").to.be.false;
        });

        it("Can Send a buffer Client -> Server",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => sess.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            const tx_base64 = tx_data.toString("base64");
            c.send(tx_data);

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(sending_msg.data), "Actually written data is not a string").to.equal("string");
            expect(sending_msg.data, "Actually written data is not base64").to.equal(tx_base64);

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(received_msg.data), "Actually received data is not a string").to.equal("string");
            expect(received_msg.data, "Actually received data is not base64").to.equal(tx_base64);
        });

        it("Can Send a buffer Server -> Client",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => c.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            const tx_base64 = tx_data.toString("base64");
            sess.send(tx_data);

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(sending_msg.data), "Actually written data is not a string").to.equal("string");
            expect(sending_msg.data, "Actually written data is not base64").to.equal(tx_base64);

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(received_msg.data), "Actually received data is not a string").to.equal("string");
            expect(received_msg.data, "Actually received data is not base64").to.equal(tx_base64);
        });

        it("Can Send a buffer Client -> Server and expect a callback",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => sess.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            const tx_base64 = tx_data.toString("base64");

            sess.on("receive", (data, {callback}) => {
                callback("got it");
            });
            const response = await new Promise(res => c.send(tx_data, (data, {type}) => res(data)) );

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(sending_msg.data), "Actually written data is not a string").to.equal("string");
            expect(sending_msg.data, "Actually written data is not base64").to.equal(tx_base64);

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(received_msg.data), "Actually received data is not a string").to.equal("string");
            expect(received_msg.data, "Actually received data is not base64").to.equal(tx_base64);

            expect(response, "Response is not 'got it'").to.equal("got it");
        });

        it("Can Send a buffer Server -> Client and expect a callback",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => c.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            const tx_base64 = tx_data.toString("base64");

            c.on("receive", (data, {callback}) => {
                callback("got it");
            });
            const response = await new Promise(res => sess.send(tx_data, (data, {type}) => res(data)) );

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(sending_msg.data), "Actually written data is not a string").to.equal("string");
            expect(sending_msg.data, "Actually written data is not base64").to.equal(tx_base64);

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(received_msg.data), "Actually received data is not a string").to.equal("string");
            expect(received_msg.data, "Actually received data is not base64").to.equal(tx_base64);

            expect(response, "Response is not 'got it'").to.equal("got it");
        });

        it("Can Send a buffer Client -> Server as a callback response",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            const tx_base64 = tx_data.toString("base64");
            c.on("receive", (data, {callback}) => {
                callback(tx_data);
            });
            const [ rx_data, type ] = await new Promise(res => sess.send("Hello", (data, {type}) => res([data, type])) );
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(sending_msg.data), "Actually written data is not a string").to.equal("string");
            expect(sending_msg.data, "Actually written data is not base64").to.equal(tx_base64);

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(received_msg.data), "Actually received data is not a string").to.equal("string");
            expect(received_msg.data, "Actually received data is not base64").to.equal(tx_base64);
        });

        it("Can Send a buffer Serve -> client as a callback response",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            const tx_base64 = tx_data.toString("base64");
            sess.on("receive", (data, {callback}) => {
                callback(tx_data);
            });
            const [ rx_data, type ] = await new Promise(res => c.send("Hello", (data, {type}) => res([data, type])) );
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(sending_msg.data), "Actually written data is not a string").to.equal("string");
            expect(sending_msg.data, "Actually written data is not base64").to.equal(tx_base64);

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(typeof(received_msg.data), "Actually received data is not a string").to.equal("string");
            expect(received_msg.data, "Actually received data is not base64").to.equal(tx_base64);
        });
    });

    describe("In binary mode", function(){
        let s,c,sess;

        beforeEach(async function(){
            const PORT=BASE_PORT++;
            s = new Sockhop.Server({port: PORT, allow_binary_mode: true, debug: true, });
            c = new Sockhop.Client({port: PORT, allow_binary_mode: true, debug: true });
            const sess_promise = new Promise(res => s.once("connect", (_,s) => res(s)));
            await s.listen();
            await c.start();
            sess = await sess_promise;
            await new Promise(res => setTimeout(res, 50)); // Let rx binary mode settle
        });

        afterEach(async function(){
            await Promise.all([
                c.disconnect(),
                s.close()
            ]);
            await new Promise(res => setTimeout(res, 100));
        });

        it("Client/Server are actually in binary_mode",async function(){

            expect(c.binary_mode.rx, "Client rx not true").to.be.true;
            expect(c.binary_mode.tx, "Client tx not true").to.be.true;
            expect(sess.binary_mode.rx, "Server rx not true").to.be.true;
            expect(sess.binary_mode.tx, "Server tx not true").to.be.true;
        });

        it("Can Send a buffer Client -> Server",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => sess.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            c.send(tx_data);

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));
        });

        it("Can Send a buffer Server -> Client",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => c.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            sess.send(tx_data);

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));
        });

        it("Can Send a buffer Client -> Server and expect a callback",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => sess.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);

            sess.on("receive", (data, {callback}) => {
                callback("got it");
            });
            const response = await new Promise(res => c.send(tx_data, (data, {type}) => res(data)) );

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(response, "Response is not 'got it'").to.equal("got it");
        });

        it("Can Send a buffer Server -> Client and expect a callback",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => c.once("receive", (data, {type}) => res([data, type])) );
            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);

            c.on("receive", (data, {callback}) => {
                callback("got it");
            });
            const response = await new Promise(res => sess.send(tx_data, (data, {type}) => res(data)) );

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(response, "Response is not 'got it'").to.equal("got it");
        });

        it("Can Send a buffer Client -> Server as a callback response",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            c.on("receive", (data, {callback}) => {
                callback(tx_data);
            });
            const [ rx_data, type ] = await new Promise(res => sess.send("Hello", (data, {type}) => res([data, type])) );
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));
        });

        it("Can Send a buffer Serve -> client as a callback response",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
            sess.on("receive", (data, {callback}) => {
                callback(tx_data);
            });
            const [ rx_data, type ] = await new Promise(res => c.send("Hello", (data, {type}) => res([data, type])) );
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'Buffer'").to.equal("Buffer");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));
        });
    });
});


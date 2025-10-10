var Sockhop=require("../index.js");
var assert=require("assert");
var { expect } = require("chai");


let BASE_PORT=50435;

describe("Typed Buffers", function(){

    describe("Not in binary mode", function(){
        let s,c,sess;

        beforeEach(async function(){
            const PORT=BASE_PORT++;
            s = new Sockhop.server({port: PORT, allow_binary_mode: false, debug: true, });
            c = new Sockhop.client({port: PORT, allow_binary_mode: false, debug: true });
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

        it("Client should throw",async function(){

            try {
                await c.send_typed_buffer("MyType", Buffer.from([0,1,2,3,4,5,6,7,8,9]));
            } catch(e){
                expect(e.message, "Wrong error message").to.equal("You cannot send typed buffers unless binary mode is enabled");
                return;
            }
            throw new Error("Did not throw");
        });

        it("Session should throw",async function(){

            try {
                await sess.send_typed_buffer("MyType", Buffer.from([0,1,2,3,4,5,6,7,8,9]));
            } catch(e){
                expect(e.message, "Wrong error message").to.equal("You cannot send typed buffers unless binary mode is enabled");
                return;
            }
            throw new Error("Did not throw");
        });

    });

    describe("In binary mode", function(){
        let s,c,sess;

        beforeEach(async function(){
            const PORT=BASE_PORT++;
            s = new Sockhop.server({port: PORT, allow_binary_mode: true, debug: true, });
            c = new Sockhop.client({port: PORT, allow_binary_mode: true, debug: true });
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

        it("Cannot use 'Buffer' as a type name",async function(){
            try {
                await sess.send_typed_buffer("Buffer", Buffer.from([0,1,2,3,4,5,6,7,8,9]));
            } catch(e){
                expect(e.message, "Wrong error message").to.equal("You cannot use 'Buffer' as a type name for typed buffers");
                return;
            }
            throw new Error("Did not throw");

        });


        const tx_data = Buffer.from([0,1,2,3,4,5,6,7,8,9]);
        it("Can Send a buffer Client -> Server",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => sess.once("receive:buffer", (data, {type}) => res([data, type])) );
            c.send_typed_buffer("MyType", tx_data);

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));
        });

        it("Can Send a buffer Server -> Client",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => c.once("receive:buffer", (data, {type}) => res([data, type])) );
            sess.send_typed_buffer("MyType", tx_data);

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));
        });

        it("Can Send a buffer Client -> Server and expect a callback",async function(){
            const sending_promise = new Promise(res => c.once("debug:sending:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => sess.once("debug:received:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => sess.once("receive:buffer", (data, {type}) => res([data, type])) );

            sess.on("receive:buffer", (data, {callback}) => {
                callback("got it");
            });
            const response = await new Promise(res => c.send_typed_buffer("MyType", tx_data, (data, {type}) => res(data)) );

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(response, "Response is not 'got it'").to.equal("got it");
        });

        it("Can Send a buffer Server -> Client and expect a callback",async function(){
            const sending_promise = new Promise(res => sess.once("debug:sending:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );
            const received_promise = new Promise(res => c.once("debug:received:buffer", (msg, buff, binary_mode) => res([msg, buff, binary_mode])) );

            const rx_promise = new Promise(res => c.once("receive:buffer", (data, {type}) => res([data, type])) );

            c.on("receive:buffer", (data, {callback}) => {
                callback("got it");
            });
            const response = await new Promise(res => sess.send_typed_buffer("MyType", tx_data, (data, {type}) => res(data)) );

            const [ rx_data, type ] = await rx_promise;
            const [ sending_msg, sending_buff, sending_binary_mode ] = await sending_promise;
            const [ received_msg, received_buff, received_binary_mode ] = await received_promise;

            expect(type, "Type is not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(rx_data), "Data is not a Buffer").to.be.true;
            expect(rx_data.equals(tx_data), "Data is not equal").to.be.true;

            expect(sending_msg.type, "Actually written object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(sending_msg.data), "Actually written data is not a Buffer").to.be.true;
            expect(sending_msg.data.toString('base64'), "Actually written data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(received_msg.type, "Actually received object was not 'MyType'").to.equal("MyType");
            expect(Buffer.isBuffer(received_msg.data), "Actually received data is not a Buffer").to.be.true;
            expect(received_msg.data.toString('base64'), "Actually received data isn't the same buffer").to.equal(tx_data.toString('base64'));

            expect(response, "Response is not 'got it'").to.equal("got it");
        });
    });
});


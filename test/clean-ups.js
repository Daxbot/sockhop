var Sockhop=require("../index.js");
const expect = require("chai").expect;

var c1,c2,s;

describe("Clean ups", function(){

    s=new Sockhop.server({port: 50002, response_timeout:10});
    c1=new Sockhop.client({port: 50002, response_timeout:10});
    c2=new Sockhop.client({port: 50002, response_timeout:10});

    before(async() => { await s.listen(); });

    it("Properly build up cached objects",async function(){

        expect(s.sockets.length).to.equal(0);
        expect(s.sessions.length).to.equal(0);
        expect(s._response_stream_maps.size).to.equal(0);
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return c1.connect();
        }).then(() => {
            return new Promise(res => setTimeout(res, 10)); // wait for the callbacks to trigger
        }).then(()=>{
            expect(s.sockets.length).to.equal(1);
            expect(s.sessions.length).to.equal(1);
            expect(s._response_stream_maps.size).to.equal(1);
        }).then(() => {
            return c2.connect();
        }).then(() => {
            expect(s.sockets.length).to.equal(2);
            expect(s.sessions.length).to.equal(2);
            expect(s._response_stream_maps.size).to.equal(2);
        });
    });

    it("Empty out objects on graceful disconnect",async function(){
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return Promise.all([
                c1.connect(),
                c2.connect()
            ]);
        }).then(() => {
            return new Promise(res => setTimeout(res, 10)); // wait for the callbacks to trigger
        }).then(()=>{
            expect(s.sockets.length, "Socket length").to.equal(2);
            expect(s.sessions.length, "Session length").to.equal(2);
            expect(s._response_stream_maps.size, "Stream map").to.equal(2);
        }).then(() => {
            return new Promise(res => {
                s.once("disconnect",res);
                c1.disconnect();
            }).then(() => {
                return new Promise(res => setTimeout(res, 1)); // wait for the disconnect to clear
            });
        }).then(() => {
            expect(s.sockets.length, "Socket length").to.equal(1);
            expect(s.sessions.length, "Session length").to.equal(1);
            expect(s._response_stream_maps.size, "Stream map").to.equal(1);
        });
    });

    it("Build a response stream",async function(){
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return new Promise(res => {
                s.once("connect", res);
                c1.connect();
            });
        }).then(()=>{
            // expect(s._response_stream_maps.get(sock)._map.size, "Stream map").to.equal(0);
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(0);
        }).then(()=>{
            return c1.request("Can I have some data?");
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(1);
            return c1.request("PLEASE!?!?!");
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(2);
        });
    });

    it("Steams clean up on timeout (client)",async function(){
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return new Promise(res => {
                s.once("connect", res);
                c1.connect();
            });
        }).then(()=>{
            return c1.request("Can I have some data?");
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(1);
            return new Promise(res => {
                for ( const vec of c1._response_stream_map._map.values() ) {
                    vec[0].once("end", res);
                }
            });
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(0);
        });
    });

    it("Steams clean up on data through (client)",async function(){
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return new Promise(res => {
                s.once("connect", res);
                c1.connect();
            });
        }).then(()=>{
            s.once("request", (req,res) => {
                res.send("yep");
            });
            return c1.request("Can I have some data?");
        }).then((stream)=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(1);
            return stream.next(); // wait for the data
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(0);
        });
    });

    it("Steams clean up on client disconnect (client)",async function(){
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return new Promise(res => {
                s.once("connect", res);
                c1.connect();
            });
        }).then(()=>{
            return c1.request("Can I have some data?");
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(1);
            return c1.disconnect();
        }).then(()=>{
            expect(c1._response_stream_map._map.size, "Stream map").to.equal(0);
        });
    });


    it("Steams clean up on timeout (server)",async function(){
        let sock;
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return new Promise(res => {
                s.once("connect", (_sock) => {
                    sock=_sock;
                    res();
                });
                c1.connect();
            });
        }).then(()=>{
            return s.request(sock,"Can I have some data?");
        }).then(()=>{
            expect(s._response_stream_maps.get(sock)._map.size, "Stream map").to.equal(1);
            return new Promise(res => {
                for ( const vec of s._response_stream_maps.get(sock)._map.values() ) {
                    vec[0].once("end", res);
                }
            });
        }).then(()=>{
            expect(s._response_stream_maps.get(sock)._map.size, "Stream map").to.equal(0);
        });
    });

    it("Steams clean up on data through (server)",async function(){
        let sock;
        await Promise.all([
            c1.disconnect(),
            c2.disconnect()
        ]).then(() => {
            return new Promise(res => {
                s.once("connect", (_sock) => {
                    sock=_sock;
                    res();
                });
                c1.connect();
            });
        }).then(()=>{
            c1.once("request", (req,res) => {
                res.send("yep");
            });
            return s.request(sock,"Can I have some data?");
        }).then((stream)=>{
            expect(s._response_stream_maps.get(sock)._map.size, "Stream map").to.equal(1);
            return stream.next();
        }).then(()=>{
            expect(s._response_stream_maps.get(sock)._map.size, "Stream map").to.equal(0);
        });
    });

    after("close server",()=>{
        s.close();
    });
});



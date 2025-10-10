var Sockhop=require("../index.js");
const expect = require("chai").expect;

var c1,c2,s;

describe("Clean ups", function(){

    s=new Sockhop.Server({port: 50002, response_timeout:10});
    c1=new Sockhop.Client({port: 50002, response_timeout:10});
    c2=new Sockhop.Client({port: 50002, response_timeout:10});

    before(async() => { await s.listen(); });

    it("Properly build up cached objects",async function(){
        this.timeout(5000);

        expect(s.sockets.length).to.equal(0);
        expect(s.sessions.length).to.equal(0);
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
        }).then(() => {
            return c2.connect();
        }).then(() => {
            expect(s.sockets.length).to.equal(2);
            expect(s.sessions.length).to.equal(2);
        });
    });

    it("Empty out objects on graceful disconnect",async function(){
        this.timeout(5000);

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
        });
    });

    after("close server",()=>{
        s.close();
    });
});



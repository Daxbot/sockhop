const TimedMap=require("../lib/TimedMap.js");
const expect = require("chai").expect;

describe("TimedMap", function(){

    beforeEach(function() {
        global.map = new TimedMap({ timeout:10 });
    });

    afterEach(function() {
        global.map.stop();
    });

    describe("Setting", function(){
        it("Can set a value", async function(){
            global.map.set("a", 1);
            expect(global.map._map.get("a")?.[0]).to.equal(1);
        });
        it("Can set two values", async function(){
            global.map.set("a", 1);
            global.map.set("b", 2);
            expect(global.map._map.get("b")?.[0]).to.equal(2);
        });
        it("Can set over a value", async function(){
            global.map.set("a", 1);
            global.map.set("a", 2);
            expect(global.map._map.get("a")?.[0]).to.equal(2);
        });
    });
    describe("Extracting", function(){
        it("Can remove a value", async function(){
            global.map.set("a", 1);
            const a = global.map.extract("a");
            expect(a).to.equal(1);
            expect(global.map._map.get("a")?.[0]).to.equal(undefined);
        });
    });
    describe("Callbacks", function(){
        it("Can set over a value", function(done){
            global.map.set("a", 1, (reason) => {
                expect(reason).to.equal("overwritten");
                done();
            });
            global.map.set("a", 2);
        });
        it("Can stop", function(done){
            global.map.set("a", 1, (reason) => {
                expect(reason).to.equal("stopped");
                done();
            });
            global.map.stop();
        });
        it("Can timeout", async function(){
            global.map.set("a", 1, (reason) => {
                expect(reason).to.equal("timed-out");
            });
            await new Promise(res => setTimeout(res, 30));
        });
    });
});



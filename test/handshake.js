var Sockhop=require("../index.js");
var assert=require("assert");
var { expect } = require("chai");


let BASE_PORT=50035;
const HANDSHAKE_TIMEOUT=300;

describe("Handshake", function(){

    it("Handshake returns fast in non-compatibility mode",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done,rej) => {
                    try {
                        let start=Date.now();
                        c.once('connect', () => {
                            let duration=Date.now()-start;
                            assert(duration<200, `Client connect duration was ${duration}ms`);
                            assert(c._handshake_resolved, "Client handshake did not resolve");
                            done();
                        });
                    } catch(err) { rej(err); }
                }),
                new Promise(async (done,rej) => {
                    try {
                        let start=Date.now();
                        s.once('connect', (sock, sess) => {
                            let duration=Date.now()-start;
                            assert(duration<200, `Server connect duration was ${duration}ms`);
                            assert(sock._handshake_resolved, "Server handshake did not resolve");
                            done();
                        });
                    } catch(err) { rej(err); }
                })
            ];

            c.connect();
            await Promise.all(promises);
        } finally {
            await c.disconnect();
            await s.close();
            await new Promise(res => setTimeout(res, 200));
        }
    });

    it("Server handshake returns slowly in client compatibility mode (slow)",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.client({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done, rej) => {
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too long").to.be.lessThan(200);
                            expect(c._handshake_resolved, "Client handshake resoved when it should not have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    s.once('connect', (sock, sess) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Server connect duration was too short").to.be.greaterThan(300);
                            expect(sock._handshake_resolved, "Client handshake resoved when it should not have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    });
                })
            ];

            c.connect();
            await Promise.all(promises);
        } finally {
            await c.disconnect();
            await s.close();
            await new Promise(res => setTimeout(res, 200));
        }
    });

    it("Server handshake returns slowly in server compatibility mode (slow)",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.server({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done, rej) => {
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too short").to.be.greaterThan(300);
                            expect(c._handshake_resolved, "Client handshake resoved when it should not have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    s.once('connect', (sock, sess) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Server connect duration was too long").to.be.lessThan(200);
                            expect(sock._handshake_resolved, "Client handshake resoved when it should not have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    });
                })
            ];

            c.connect();
            await Promise.all(promises);
        } finally {
            await c.disconnect();
            await s.close();
            await new Promise(res => setTimeout(res, 200));
        }
    });

    it("Handshake totally skipped if both in compatibility mode",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.server({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.client({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done, rej) => {
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too long").to.be.lessThan(200);
                            expect(c._handshake_resolved, "Client handshake resoved when it should not have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    s.once('connect', (sock, sess) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Server connect duration was too long").to.be.lessThan(200);
                            expect(sock._handshake_resolved, "Client handshake resoved when it should not have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    });
                })
            ];

            c.connect();
            await Promise.all(promises);
        } finally {
            await c.disconnect();
            await s.close();
            await new Promise(res => setTimeout(res, 200));
        }
    });
});


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
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too long").to.be.lessThan(200);
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
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    c.once('handshake', (success, error) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client handshake duration was too long").to.be.lessThan(200);
                            expect(success, "Client handshake did not resolve").to.be.true;
                            expect(error, "Client handshake returned an error").to.be.undefined;
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    s.once('handshake', (_, __, success, error) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Server handshake duration was too long").to.be.lessThan(200);
                            expect(success, "Server handshake did not resolve").to.be.true;
                            expect(error, "Server handshake returned an error").to.be.undefined;
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

    it("Server handshake returns slowly in client compatibility mode (slow)",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.client({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too long").to.be.lessThan(200);
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
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done, rej) => {
                    let failed = false;
                    c.once('handshake', () => {
                        failed = true;
                    });
                    setTimeout(() => {
                        try {
                            expect(failed, "Client handshake event fired when it shouldn't have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    }, HANDSHAKE_TIMEOUT + 100);
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    s.once('handshake', (_,__,success,error) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Server handshake duration was too short").to.be.greaterThan(300);
                            expect(success, "Server handshake resovled but shouldn't've").to.be.false;
                            expect(error, "Server handshake didn't return an error").to.not.be.undefined;
                            expect(error.message, "Server handshake error message incorrect").to.equal("Timeout exceeded waiting for handshake()");
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

    it("Client handshake returns slowly in server compatibility mode (slow)",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.server({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too long").to.be.lessThan(200);
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
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    c.once('handshake', (success,error) => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client handshake duration was too short").to.be.greaterThan(300);
                            expect(success, "Client handshake resovled but shouldn't've").to.be.false;
                            expect(error, "Client handshake didn't return an error").to.not.be.undefined;
                            expect(error.message, "Client handshake error message incorrect").to.equal("Timeout exceeded waiting for handshake()");
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done, rej) => {
                    let failed = false;
                    s.once('handshake', () => {
                        failed = true;
                    });
                    setTimeout(() => {
                        try {
                            expect(failed, "Server handshake event fired when it shouldn't have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    }, HANDSHAKE_TIMEOUT + 100);
                }),
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
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    c.once('connect', () => {
                        try {
                            let duration=Date.now()-start;
                            expect(duration, "Client connect duration was too long").to.be.lessThan(200);
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
                            done();
                        } catch(err) { rej(err); }
                    });
                }),
                new Promise(async (done, rej) => {
                    let failed = false;
                    c.once('handshake', () => {
                        failed = true;
                    });
                    setTimeout(() => {
                        try {
                            expect(failed, "Client handshake event fired when it shouldn't have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    }, HANDSHAKE_TIMEOUT + 100);
                }),
                new Promise(async (done, rej) => {
                    let failed = false;
                    s.once('handshake', () => {
                        failed = true;
                    });
                    setTimeout(() => {
                        try {
                            expect(failed, "Server handshake event fired when it shouldn't have").to.be.false;
                            done();
                        } catch(err) { rej(err); }
                    }, HANDSHAKE_TIMEOUT + 100);
                }),
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


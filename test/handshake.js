var Sockhop=require("../index.js");
var assert=require("assert");
var { expect } = require("chai");


let BASE_PORT=50035;
const HANDSHAKE_TIMEOUT=300;

describe("Handshake", function(){

    it("Handshake events all fire as expected",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.Server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.Client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            let got_client_handshake=false;
            c.once('handshake', (success, error) => {
                if ( success ) got_client_handshake=true;
            });
            let got_client_unhandshake=false;
            c.once('unhandshake', () => {
                got_client_unhandshake=true;
            });

            let got_server_handshake=false;
            s.once('handshake', (_,__,success, error) => {
                if ( success ) got_server_handshake=true;
            });
            let got_server_unhandshake=false;
            s.once('unhandshake', () => {
                got_server_unhandshake=true;
            });

            let got_session_handshake=false;
            let got_session_unhandshake=false;
            s.on('connect', (_,s) => {
                s.once("handshake",(success) => {
                    got_session_handshake = success;
                });
                s.once("unhandshake",() => {
                    got_session_unhandshake = true;
                });
            });

            await c.start();
            await c.disconnect();
            await new Promise(res => setTimeout(res, 50)); // let events propagate

            expect(got_client_handshake, "Client did not get handshake event").to.be.true;
            expect(got_client_unhandshake, "Client did not get unhandshake event").to.be.true;
            expect(got_server_handshake, "Server did not get handshake event").to.be.true;
            expect(got_server_unhandshake, "Server did not get unhandshake event").to.be.true;
            expect(got_session_handshake, "Session did not get handshake event").to.be.true;
            expect(got_session_unhandshake, "Session did not get unhandshake event").to.be.true;

        } finally {
            await c.disconnect();
            await s.close();
            await new Promise(res => setTimeout(res, 200));
        }
    });

    it("Handshake returns fast in non-compatibility mode",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.Server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.Client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
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
        const s = new Sockhop.Server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.Client({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
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
        const s = new Sockhop.Server({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.Client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
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
        const s = new Sockhop.Server({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.Client({port: PORT, compatibility_mode: true, handshake_timeout: HANDSHAKE_TIMEOUT});
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

    it("Handshake is passed to session",async function(){
        const PORT=BASE_PORT++;
        const s = new Sockhop.Server({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        const c = new Sockhop.Client({port: PORT, compatibility_mode: false, handshake_timeout: HANDSHAKE_TIMEOUT});
        try {
            await s.listen();

            const promises = [
                new Promise(async (done,rej) => {
                    let start=Date.now();
                    s.once('connect', (_, sess) => {
                        if ( sess.init_complete ) {
                            return rej(new Error("Session init_complete was already true on connect -- you have a nasty timing bug, good luck, bro."));
                        }
                        sess.once('handshake', (success, error) => {
                            try {
                                let duration=Date.now()-start;
                                expect(duration, "Session handshake duration was too long").to.be.lessThan(200);
                                expect(success, "Session handshake did not resolve").to.be.true;
                                expect(error, "Session handshake returned an error").to.be.undefined;
                                done();
                            } catch(err) { rej(err); }
                        });
                    });
                })
            ];

            await new Promise(res => setTimeout(res, 50)); // let the event handlers bind

            c.connect();
            await Promise.all(promises);
        } finally {
            await c.disconnect();
            await s.close();
            await new Promise(res => setTimeout(res, 200));
        }
    });
});


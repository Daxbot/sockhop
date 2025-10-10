var Sockhop=require("../index.js");
var assert=require("assert");
const sinon = require('sinon');
const net = require('net');
var c,s,sock,sock_connect;

describe("Client Socket Hangups",function () {


    c=new Sockhop.Client({port: 50000});
    sock = new net.Socket(); // create a mock socket

    this.slow(1000);

    //Restore the connect function on each completed
    afterEach(function () {
        sock_connect.restore();
    });

    it("throws timeout error on connection hang", (done)=>{

        // create a custom mock object that returns the mock socket when createConnection is called
        sock_connect = sinon.stub(net, 'createConnection').callsFake(() => {
            return sock;
        });

        c._connect_timeout = 200;

        c.connect()
            .catch((e)=>{
                assert(e.message.match("Timeout exceeded on connect()"));
                done();
            });
    });


});

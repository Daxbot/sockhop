"use strict";
var Promise=require("bluebird");
var net=Promise.promisifyAll(require("net"));
var EventEmitter=require("events").EventEmitter;
var inherits = require("util").inherits;




class SockhopClient extends EventEmitter{

	constructor(opts={}){

		super();
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;

		this.socket=new net.Socket();
		this.socket.on("data", (data)=>{

			var o=JSON.parse(data);

			this.emit("receive", o.data);
		});

	}

	connect(){

		return this.socket.connectAsync(this.port,this.address);	
	}

	get_bound_address(){

		return this.socket.address().address;
	}

	send(o){


		// Create a message
		var m=JSON.stringify({
			"type"	:	o.classname,
			data	:	o
		});		


		return this.socket.writeAsync(m);	
	}	
}





class SockhopServer extends EventEmitter {

	constructor(opts={}){

		super();
		var _self=this;
		this.address=opts.address||"127.0.0.1";
		this.port=opts.port||50000;
		this.sockets=[];
		this.server=net.createServer();
		this.server.on('connection', function(sock){

			sock
				.setEncoding('utf8')
				.on('data',function(data){
					
					var o=JSON.parse(data);
					_self.emit("receive", o.data);

				});

			_self.sockets.push(sock);
		});
	}

	listen(){

		return this.server.listenAsync(this.port, this.address);
	}

	get_bound_address(){

		return this.server.address().address;
	}


}



module.exports=exports={

	"server"	:	SockhopServer,
	"client"	:	SockhopClient
};
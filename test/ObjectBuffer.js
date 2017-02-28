var ObjectBuffer=require("../lib/ObjectBuffer.js");
var assert=require("assert");

describe("ObjectBuffer", function(){


	describe("Newline terminator", function(){

		// Create an ObjectBuffer
		var ob=new ObjectBuffer();

		// Create some objects
		var objects=[];
		for(let n=0; n<3; n++) {
			objects.push({
				"index" : n
			});
		}

		// A place to store the resulting Buffers
		var buffers=[];

		it("obj2buf", function(){

			// Convert all Objects into Buffers
			objects.forEach((o)=>buffers.push(ob.obj2buf(o)));
			assert.equal(objects.length, buffers.length);

		});

		it("buf2obj (from fragments)", function(){

			// Convert all Buffers back into objects, but only feed a little bit at once to simulate fragmentation
			let out=[];
			buffers.forEach((b)=>{

				for(let n=0; n<b.length; n++){

					let fragment=Buffer.allocUnsafe(1);
					b.copy(fragment, 0, n, n+1);
					ob.buf2obj(fragment).forEach((o)=>out.push(o)); // jshint ignore:line
				}
			});

			assert.deepEqual(out,objects);
		});

		it("buf2obj (concatenated)", function(){

			let concatenated=Buffer.allocUnsafe(buffers[0].length*buffers.length);
			let idx=0;
			for(let n=0; n<buffers.length; n++){

				idx+=buffers[n].copy(concatenated,idx,0, buffers[n].length);

			}

			let out=ob.buf2obj(concatenated);
			assert.deepEqual(out,objects);

		});

	});

	describe("String terminator", function(){

		// Create an ObjectBuffer
		var ob=new ObjectBuffer({terminator:"\n.\n"});

		// Create some objects
		var objects=[];
		for(let n=0; n<3; n++) {
			objects.push({
				"index" : n
			});
		}

		// A place to store the resulting Buffers
		var buffers=[];

		it("obj2buf", function(){

			// Convert all Objects into Buffers
			objects.forEach((o)=>buffers.push(ob.obj2buf(o)));
			assert.equal(objects.length, buffers.length);

		});

		it("buf2obj (from fragments)", function(){

			// Convert all Buffers back into objects, but only feed a little bit at once to simulate fragmentation
			let out=[];
			buffers.forEach((b)=>{

				for(let n=0; n<b.length; n++){

					let fragment=Buffer.allocUnsafe(1);
					b.copy(fragment, 0, n, n+1);
					ob.buf2obj(fragment).forEach((o)=>out.push(o)); // jshint ignore:line
				}
			});

			assert.deepEqual(out,objects);
		});

		it("buf2obj (concatenated)", function(){

			let concatenated=Buffer.allocUnsafe(buffers[0].length*buffers.length);
			let idx=0;
			for(let n=0; n<buffers.length; n++){

				idx+=buffers[n].copy(concatenated,idx,0, buffers[n].length);

			}

			let out=ob.buf2obj(concatenated);
			assert.deepEqual(out,objects);

		});

	});


});





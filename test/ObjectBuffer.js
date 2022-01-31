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
                    ob.buf2obj(fragment).forEach((o)=>out.push(o));
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
                    ob.buf2obj(fragment).forEach((o)=>out.push(o));
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

    describe("Split terminators (constuctor passed an array of terminators)", function(){

        // Create ObjectBuffers
        var ob_a=new ObjectBuffer({terminator:["Weasel","Fish"]});
        var ob_b=new ObjectBuffer({terminator:["Fish","Weasel"]});            // Notice they are swapped here, since a receives what b transmits and vice versa

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
            objects.forEach((o)=>buffers.push(ob_a.obj2buf(o)));
            assert.equal(objects.length, buffers.length);

        });

        it("buf2obj (from fragments)", function(){

            // Convert all Buffers back into objects, but only feed a little bit at once to simulate fragmentation
            let out=[];
            buffers.forEach((b)=>{

                for(let n=0; n<b.length; n++){

                    let fragment=Buffer.allocUnsafe(1);
                    b.copy(fragment, 0, n, n+1);
                    ob_b.buf2obj(fragment).forEach((o)=>out.push(o));
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

            let out=ob_b.buf2obj(concatenated);
            assert.deepEqual(out,objects);

        });

    });


    describe("Non JSON objects", function(){


        it("obj2buf rejects string", function(done){

            // Create an ObjectBuffer
            let ob=new ObjectBuffer({allow_non_objects: false});

            ob.once("error",(e)=>{

                assert(e.toString().match(/non object type/));
                done();
            });

            ob.obj2buf("This is a string");
        });

        it("buf2obj rejects non JSON string", function(done){

            // Create an ObjectBuffer
            let ob=new ObjectBuffer({allow_non_objects: false});

            ob.once("error",(e)=>{

                assert(e.toString().match(/corrupted data in buffer/));
                done();
            });

            ob.buf2obj(Buffer.from("This is a buffer from a string\n"));
        });


        it("obj2buf accepts string with allow_non_objects===true", function(){

            // Create an ObjectBuffer
            let ob=new ObjectBuffer({allow_non_objects: true});

            let buffer=ob.obj2buf("This is a string");
            assert.equal(buffer.toString(), "\"This is a string\"\n");        // It was converted to a JSON string
        });

        it("buf2obj accepts buffer from string with allow_non_objects===true", function(){

            // Create an ObjectBuffer
            let ob=new ObjectBuffer({allow_non_objects: true});

            ob.buf2obj(Buffer.from("This is a buffer from a string\n"));
        });

    });
    // describe("Allow non JSON objects", function(){

    //     // Create an ObjectBuffer
    //     var ob=new ObjectBuffer({allow_non_objects: false});

    //     // Create some objects
    //     var objects=[];
    //     for(let n=0; n<3; n++) {
    //         objects.push("I am a string");
    //     }

    //     // A place to store the resulting Buffers
    //     var buffers=[];

    //     it("obj2buf", function(){

    //         // Convert all Objects into Buffers
    //         objects.forEach((o)=>buffers.push(ob.obj2buf(o)));
    //         assert.equal(objects.length, buffers.length);

    //     });

    //     it("buf2obj (from fragments)", function(){

    //         // Convert all Buffers back into objects, but only feed a little bit at once to simulate fragmentation
    //         let out=[];
    //         buffers.forEach((b)=>{

    //             for(let n=0; n<b.length; n++){

    //                 let fragment=Buffer.allocUnsafe(1);
    //                 b.copy(fragment, 0, n, n+1);
    //                 ob.buf2obj(fragment).forEach((o)=>out.push(o));
    //             }
    //         });

    //         assert.deepEqual(out,objects);
    //     });

    //     it("buf2obj (concatenated)", function(){

    //         let concatenated=Buffer.allocUnsafe(buffers[0].length*buffers.length);
    //         let idx=0;
    //         for(let n=0; n<buffers.length; n++){

    //             idx+=buffers[n].copy(concatenated,idx,0, buffers[n].length);

    //         }

    //         let out=ob.buf2obj(concatenated);
    //         assert.deepEqual(out,objects);

    //     });

    // });

});





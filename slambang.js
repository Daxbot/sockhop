var Sockhop=require("./index.js");

// We exist to test violent, unclean disconnects.  We hang up once someone connects.

s=new Sockhop.server({port: 50010});

console.log("server starting!!");

s.listen();
s.on("connect",()=>{

    console.log("Quitting!!!");
    process.exit();

});

// Timebomb ourself so we don't hang out there in the background if we are forgotten
setTimeout(()=>{

    process.exit();

}, parseInt(process.argv[2] || 1000));

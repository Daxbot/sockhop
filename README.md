## Sockhop
Extra cool sockets for node.js

#### Example
```javascript

	// Client
	var c=new Sockhop.client();
	c.on("receive", (msg, metadata)=>{

		// We have data
	});

	// Server
	var s=new Sockhop.server();
	s
		.listen()
		.then(()=>{

			return c.connect();
		})
		.then(()=>{

			s.sendall("This goes to all clients");

		});


```

#### Intro
Sockhop wraps node sockets and gives you:

- Easy control and events for things that can be tricky ("is my client still connected?")
- Easy passing of arbitrary objects
- Ping across connections


#### Notes
Sockhop easily passes objects across the wire.  If you pack/transcode JS in a way that mutates class names, this functionality will be broken!  This includes autp ping functionality.

#### License
MIT
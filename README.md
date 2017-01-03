## Sockhop
Extra cool sockets for node.js

#### Intro
Sockhop wraps node sockets and gives you:

- Easy control and events for things that can be tricky ("is my client still connected?")
- Easy passing of arbitrary objects
- Ping across connections
- Auto reconnect


#### Notes
Sockhop easily passes objects across the wire.  If you pack/transcode JS in a way that mutates class names, this functionality will be broken!  This includes autp ping functionality.
# Simple Node.js TCP+HTTP Server
- A custom web server engine that uses the net module to listen for incoming connections and the http module to handle HTTP requests
- This engine is designed to be used as a backend server for web applications
- It supports GET and POST methods, as well as serving static files from a public directory
- It also includes custom events for listening for incoming connections and errors
- The engine is designed to be used with the ServerResponse class, which is a modified version of the http.ServerResponse class that includes custom methods
- This engine was created by Evan G. Parker, https://github.com/z46-dev

## Usage
Creating a new server that listens on port `3000` is super simple.
```js
import Server from "./lib/Server.js";

const server = new Server(3000);

server.get("/", (request, response) => {
    response.send("Hello, World!");
});

server.start(() => console.log("Server listening on port", server.port));
```

You can also use a POST method and reference the body as a `Buffer` from `request.body`. Sending JSON data is also easy, just pass a JSON object through `response.json` or pass the stringified JSON right through!
```js
import Server from "./lib/Server.js";

const server = new Server(3000);

server.post("/", (request, response) => {
    console.log("A request said:", request.body.toString());
    response.json({
        ok: true,
        body: request.body.toString()
    });
});

server.start(() => console.log("Server listening on port", server.port));
```

Publicizing an entire directory is easy, just use `server.publicize`. If the directory does not exist, a `ReferenceError` is thrown.
```js
import Server from "./lib/Server.js";

const server = new Server(3000);

try {
    server.publicize("./public");
} catch (error) {
    console.error(error);
}

server.start(() => console.log("Server listening on port", server.port));
```

You can utilize a TCP socket (`net.Socket`) using listeners too!
```js
import Server from "./lib/Server.js";

const server = new Server(3000);

server.on("socket", socket => {
    // Handle the socket like you normally would
});

server.on("error", error => {
    // Handle the error (TCP | HTTP)
});

server.start(() => console.log("Server listening on port", server.port));
```

## "Installation"
IDK why you would but just paste `/lib/Server.js` somewhere in ur project and import it where needed. I'm just putting this here so I can use it and improve it when needed, I might make it into a npm module if it gets enough usage or support.
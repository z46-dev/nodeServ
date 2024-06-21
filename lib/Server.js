// A custom web server engine that uses the net module to listen for incoming connections and the http module to handle HTTP requests
// This engine is designed to be used as a backend server for web applications
// It supports GET and POST methods, as well as serving static files from a public directory
// It also includes custom events for listening for incoming connections and errors
// The engine is designed to be used with the ServerResponse class, which is a modified version of the http.ServerResponse class that includes custom methods
// This engine was created by Evan G. Parker, https://github.com/z46-dev

import net from "net";
import http from "http";
import url from "url";
import fs from "fs";

// A modified version of the http.ServerResponse class that includes custom methods
class ServerResponse extends http.ServerResponse {
    /**
     * Sends the content to the client, ends the response, and closes the connection to the client
     * @param {string} content The content to send
     */
    send(content) { }

    /**
     * Sends the JSON object to the client, ends the response, and closes the connection to the client
     * @param {Object|string} json The JSON object to send
     */
    json(json) { }
}

const pageNotFound = `<!DOCTYPE html><html><head><title>Page not found</title><style> * { font-family: sans-serif; font-size: x-large; font-weight: bold; } body { width: 100%; height: 100%; padding: 0px; margin: 0px; background-image: repeating-conic-gradient(#F8F8F8 0 15deg, #FFFFFF 15deg 30deg); background-attachment: fixed; text-align: center; } #mainBody { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); } #mainBody h1 { font-size: xxx-large; } .smaller { font-size: large; font-weight: normal; } #footer { position: absolute; bottom: 5%; left: 50%; transform: translate(-50%, -50%); } </style></head><body><div id="mainBody"> <h1>404</h1><span>The page or resource you requested cannot be served.</span><br/><span class="smaller">If you know the site's manager or owner, please contact them.</span></div><span id="footer" class="smaller">This site is powered by a custom webserver engine made by Evan G. Parker.</span></body></html>`;

export default class Server {
    /** @type {net.Server} */
    #server = null;

    /** @type {http.Server} */
    #httpServer = null;

    #events = {};

    /** @type {Map<string, function(http.IncomingMessage, http.ServerResponse)>} */
    #getMethods = new Map();

    /** @type {Map<string, function(http.IncomingMessage, http.ServerResponse)>} */
    #postMethods = new Map();

    #publicDirectory = null;

    constructor(port, accessControlAllowOrigin = "*") {
        if (!Number.isFinite(parseInt(port)) || parseInt(port) !== Math.round(parseInt(port))) {
            throw new RangeError("The argument 'port' must be a valid integer!");
        }

        this.#server = net.createServer(this.#listener.bind(this));
        this.#httpServer = http.createServer((request, response) => this.#handleHTTP(request, response));

        this.port = port;
        this.responseHeaders = {
            "Access-Control-Allow-Origin": accessControlAllowOrigin,
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
            "Access-Control-Max-Age": 2592000
        };
    }

    #emit(event, ...args) {
        if (this.#events[event]) {
            this.#events[event].forEach(listener => listener(...args));
        }
    }

    /**
     * Adds an event listener to the server
     * @param {"socket"|"error"} event The event to listen for
     * @param {function(...any)} listener The function to run when the event is emitted
     */
    on(event, listener) {
        if (!this.#events[event]) {
            this.#events[event] = [];
        }

        this.#events[event].push(listener);
    }

    /**
     * Listens for incoming connections on the server
     * @param {net.Socket} socket The net.Socket object
     */
    #listener(socket) {
        let buffer = Buffer.alloc(0);

        socket.on("data", chunk => {
            buffer = Buffer.concat([buffer, chunk]);

            if (buffer.length >= 4) {
                const method = buffer.subarray(0, 4).toString("utf8");
                socket.removeAllListeners("data");

                if (["GET ", "POST", "HEAD", "PUT ", "DEL "].includes(method)) {
                    this.#httpServer.emit("connection", socket);
                } else {
                    this.#emit("socket", socket);
                }

                socket.unshift(buffer);
            }
        });

        socket.on("error", error => this.#emit("error", error));
    }

    /**
     * Modifies the response object to include custom methods
     * @param {http.ServerResponse} response The initial response object
     * @returns {ServerResponse} The modified response object
     */
    #responsify(response) {
        response.send = content => {
            response.writeHead(200, this.responseHeaders);
            response.end(content);
        }

        response.json = json => {
            if (typeof json === "object") {
                json = JSON.stringify(json);
            }

            response.send(json);
        }

        response.on("error", error => this.#emit("error", error));

        return response;
    }

    /**
     * Gets the MIME type of a file based on its extension
     * @param {string} file The file to get the MIME type of
     * @returns {string} The MIME type of the file
     */
    #getMimeType(file) {
        return {
            "html": "text/html",
            "css": "text/css",
            "js": "text/javascript",
            "json": "application/json",
            "png": "image/png",
            "jpg": "image/jpg",
            "gif": "image/gif",
            "svg": "image/svg+xml",
            "ico": "image/x-icon",
            "ttf": "font/ttf",
            "otf": "font/otf",
            "woff": "font/woff",
            "woff2": "font/woff2",
            "eot": "font/eot",
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
            "pdf": "application/pdf",
            "zip": "application/zip",
            "rar": "application/x-rar-compressed",
            "7z": "application/x-7z-compressed",
            "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls": "application/vnd.ms-excel",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "ppt": "application/vnd.ms-powerpoint",
            "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "xml": "application/xml",
            "txt": "text/plain",
            "wasm": "application/wasm"
        }[file.split(".").pop()] || "application/octet-stream";
    }

    /**
     * Handles the HTTP request
     * @param {http.IncomingMessage} request The request object
     * @param {http.ServerResponse} response The response object
     */
    #handleHTTP(request, response) {
        const path = url.parse(request.url).pathname.replace(/\/+$/, "") || "/";
        response = this.#responsify(response);

        if (this.#getMethods.has(path)) {
            this.#getMethods.get(path)(request, response);
            return;
        }

        if (this.#postMethods.has(path) && request.method === "POST") {
            let body = Buffer.alloc(1);

            request.on("data", chunk => {
                body = Buffer.concat([body, Buffer.from(chunk)]);
            });

            request.on("end", () => {
                request.body = body.subarray(1);
                this.#postMethods.get(path)(request, response);
            });

            return;
        }

        if (this.#publicDirectory !== null) {
            const filePath = this.#publicDirectory + (path === "/" ? "/index.html" : path);

            if (fs.existsSync(filePath)) {
                if (fs.statSync(filePath).isDirectory()) {
                    response.writeHead(404, this.responseHeaders);
                    response.end(pageNotFound);
                    return;
                }

                response.setHeader("Content-Type", this.#getMimeType(filePath));
                response.send(fs.readFileSync(filePath));
                return;
            }
        }

        response.writeHead(404, this.responseHeaders);
        response.end(pageNotFound);
    }

    /**
     * Adds a http GET method, used when no body is needed to retrieve data 
     * @param {string} rout The rout you want to add a method too
     * @param {function(http.IncomingMessage, ServerResponse)} callback What you want to happen when someone goes to this rout
     */
    get(rout, callback) {
        this.#getMethods.set(rout, callback);
    }

    /**
     * Adds a http POST method, used when a body is needed to retrieve data
     * @param {string} rout The rout you want to add a method too
     * @param {function(http.IncomingMessage, ServerResponse)} callback What you want to happen when someone goes to this rout
     */
    post(rout, callback) {
        this.#postMethods.set(rout, callback);
    }

    /**
     * Sets the public directory where the server will look for files to serve
     * @param {string} path The path to the directory you want to serve files from
     * @throws {ReferenceError} If the directory you specified does not exist
     */
    publicize(path) {
        if (!fs.existsSync(path)) {
            throw new ReferenceError("The directory you specified does not exist!");
        }

        this.#publicDirectory = path;
    }

    /**
     * Starts the server
     * @param {function} callback An optional function to run when the server starts
     */
    start() {
        this.#server.listen(this.port, arguments[0] ?? (() => { }));
    }
}
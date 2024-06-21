import Server from "./lib/Server.js";

const server = new Server(3000);
server.publicize("./public");

server.get("/whoAmI", (request, response) => {
    response.send("Hello, you're " + (request.headers["x-forwarded-for"] ?? request.connection.remoteAddress) + "!");
});

server.post("/echo", (request, response) => {
    response.send(request.body.toString());
});

server.on("socket", /** @param {import("net").Socket} socket */ socket => {
    console.log("Client connected:", socket.remoteAddress);

    socket.on("data", data => {
        console.log("[Message from Client]:", data.toString());
    });

    socket.on("end", () => console.log("Client disconnected."));

    socket.write("Hello, you're " + socket.remoteAddress + "!");
});

server.on("error", error => {
    console.error("Server error:", error);
});

server.start(async () => {
    console.log("Server started on port", server.port);

    const socket = (await import("net")).connect(server.port, "localhost", () => {
        socket.on("data", data => {
            console.log("[Message from Server]:", data.toString());
        });

        socket.write("Hello, server!");

        setTimeout(socket.destroy.bind(socket), 1000);
    });
});
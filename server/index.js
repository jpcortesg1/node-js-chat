import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";

import { Server } from "socket.io";
import { createServer } from "http";

// Configurations
// Define port
const PORT = process.env.PORT ?? 3000;
// Configure dotenv
dotenv.config();

// Create express app
const app = express();

// Create server http, helps us to create socket united with express app
// We in this line only add express app to server
const server = createServer(app);
// Add socket to server
const io = new Server(server, {
  connectionStateRecovery: {}, // Add time to save messages lost
});

// Db connection
const db = createClient({
  url: "libsql://driving-moondragon-jpcortesg1.turso.io",
  authToken: process.env.DB_TOKEN,
});

// Create table
await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    username TEXT
  )
`);

// Socket connection
io.on("connection", async (socket) => {
  console.log("A user has connected");

  // Socket disconnection
  socket.on("disconnect", () => {
    console.log("A user has disconnected");
  });

  // Receive message from client
  socket.on("chat message", async (msg) => {
    // Save message in db
    let result;
    const username = socket.handshake.auth.username ?? "Anonymous";
    try {
      result = await db.execute({
        sql: "INSERT INTO messages (content, username)  VALUES (:content, :username)",
        args: {
          content: msg,
          username,
        },
      });
    } catch (error) {
      console.log(error);
      return;
    }

    // Send message to all clients
    io.emit("chat message", msg, result.lastInsertRowid.toString(), username);
  });

  // See auth
  // console.log("auth");
  // console.log(socket.handshake.auth);

  // Recover messages withouth connection
  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: "SELECT id, content, username FROM messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffeset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", row.content, row.id, row.username);
      });
    } catch (error) {
      console.log(error);
    }
  }
});

// For get a loggs
app.use(logger("dev"));

// Defines static files
app.use(express.static(process.cwd() + "/client/assets"));

// Main route
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

// Start server
server.listen(PORT, () => {
  console.log(`Server has been started on port ${PORT}...`);
});

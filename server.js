// 🟣 server.js — arbeauty-chatbot

import express from "express";
import bodyParser from "body-parser";
import metaRouter from "./webhooks/meta.js";
import http from "http";
import { Server } from "socket.io";

// Inicializamos Express
const app = express();
app.use(bodyParser.json());

// Creamos servidor HTTP (necesario para usar socket.io)
const server = http.createServer(app);

// Configuramos Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Puedes restringirlo luego a tu dominio frontend
  },
});

// Guardamos la referencia de io para usarla en otros archivos
app.set("io", io);

// Escuchar eventos de conexión desde el frontend
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado al socket:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// 🔹 Conectamos el router de Meta (WhatsApp Webhook)
app.use("/webhooks/meta", metaRouter);

// 🔹 Ruta base de prueba
app.get("/", (req, res) => {
  res.send("Servidor ARBEAUTY activo 🚀 con conexión en tiempo real ✅");
});

// 🔹 Inicializamos el servidor
const PORT = process.env.PORT || 10000;
server.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`)
);

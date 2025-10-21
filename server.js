// 🟣 server.js — versión estable ARBEAUTY Chatbot

import express from "express";
import bodyParser from "body-parser";
import cors from "cors"; // 👈 Importamos CORS
import http from "http";
import { Server } from "socket.io";
import metaRouter from "./webhooks/meta.js";

// 🔹 Inicializamos Express
const app = express();

// 🔹 Habilitar CORS globalmente (necesario para desarrollo local)
app.use(
  cors({
    origin: "*", // ⚠️ en producción cambia esto por tu dominio real
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// 🔹 Parseo de JSON
app.use(bodyParser.json());

// 🔹 Servidor HTTP (necesario para socket.io)
const server = http.createServer(app);

// 🔹 Configuración de Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexión desde tu panel (live-server o dominio)
  },
});

// Guardamos la instancia global de Socket.io
app.set("io", io);

// 🧩 Escuchar conexiones en tiempo real desde el frontend
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado al socket:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// 🔹 Conectar el router de Meta (WhatsApp Webhook)
app.use("/webhooks/meta", metaRouter);

// 🔹 Ruta base de prueba
app.get("/", (req, res) => {
  res.send("🚀 Servidor ARBEAUTY activo y listo 💖 con conexión en tiempo real ✅");
});

// 🔹 Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

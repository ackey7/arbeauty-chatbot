// 🟣 server.js — versión estable ARBEAUTY Chatbot (con frontend habilitado)

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import metaRouter from "./webhooks/meta.js";

// 🔹 Inicializamos Express
const app = express();

// 🔹 Habilitar CORS globalmente (necesario para desarrollo local y Render)
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
    origin: "*", // Permite conexión desde tu panel o dominio Render
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

// 🟣 Alias adicional para compatibilidad con la verificación de Meta
app.use("/webhook", (req, res, next) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token === "arbeauty_verify_token") {
      console.log("✅ Webhook verificado correctamente (alias)");
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } else {
    next();
  }
});

// ===========================================================
// 🟣 🔹 NUEVA SECCIÓN: Servir el frontend (panel web)
// ===========================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir los archivos estáticos desde /frontend
app.use(express.static(path.join(__dirname, "frontend")));

// Si visitan la raíz del dominio, mostrar el panel
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});
// ===========================================================

// 🔹 Iniciar servidor
const PORT = process.env.PORT || 10000; // ⚙️ Render usa puerto 10000
server.listen(PORT, () => {
  console.log(`🚀 Servidor ARBEAUTY activo y listo 💖 en puerto ${PORT}`);
});

// 🟣 meta.js — arbeauty chatbot oficial

import express from "express";
import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 🔹 CONFIGURACIONES
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🔹 CONEXIÓN A MONGODB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado a MongoDB Atlas"))
.catch(err => console.error("❌ Error conectando a MongoDB:", err));

// 🔹 MODELO DE SESIÓN
const sessionSchema = new mongoose.Schema({
  telefono: { type: String, unique: true },
  step: { type: String, default: "inicio" },
  ciudad: { type: String, default: null },
  datos: { type: Object, default: {} },
});

const Session = mongoose.model("Session", sessionSchema);

// 🔹 VERIFICACIÓN WEBHOOK
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 🔹 RECEPCIÓN DE MENSAJES
router.post("/", async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const texto = message.text?.body?.trim() || "";
        console.log(`📩 Mensaje recibido de ${from}: ${texto}`);

        let session = await Session.findOne({ telefono: from });
        if (!session) {
          session = await Session.create({ telefono: from });
        }

        // Lógica del flujo principal
        if (session.step === "inicio") {
          await enviarMensaje(from, "👋 ¡Hola! Soy el asistente de *arbeauty* 💖\n¿De qué ciudad nos escribes?\n\n1️⃣ San Pedro Sula\n2️⃣ Tegucigalpa\n3️⃣ Otra zona de Honduras");
          session.step = "esperando_ciudad";
          await session.save();
        } 
        else if (session.step === "esperando_ciudad") {
          if (texto === "1") {
            session.ciudad = "SPS";
            session.step = "ciudad_confirmada";
            await enviarMensaje(from, "📍 ¡Perfecto! Te atenderemos desde *San Pedro Sula* ❤️");
          } else if (texto === "2") {
            session.ciudad = "TGU";
            session.step = "ciudad_confirmada";
            await enviarMensaje(from, "📍 ¡Perfecto! Te atenderemos desde *Tegucigalpa* 💕");
          } else {
            session.ciudad = "OTRA";
            session.step = "ciudad_confirmada";
            await enviarMensaje(from, "✨ Gracias, te atenderemos desde la central de *arbeauty* 🌸");
          }
          await session.save();

          await clasificarChat(from, session.ciudad);

        } 
        else if (session.step === "ciudad_confirmada") {
          await enviarMensaje(from, "💬 Gracias por escribirnos 💖\nEn breve uno de nuestros asesores de *arbeauty* te atenderá personalmente.");
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error procesando el mensaje:", err);
    res.sendStatus(500);
  }
});

// 🔹 FUNCIÓN PARA ENVIAR MENSAJES
async function enviarMensaje(to, body) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/807852259084079/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`💬 Mensaje enviado a ${to}: ${body}`);
  } catch (error) {
    console.error("⚠️ Error enviando mensaje:", error.response?.data || error.message);
  }
}

// 🔹 FUNCIÓN PARA CLASIFICAR CHAT EN EL PANEL
async function clasificarChat(telefono, ciudad) {
  try {
    // Mapeamos la ciudad según el código
    const pestaña =
      ciudad === "SPS"
        ? "san-pedro-sula"
        : ciudad === "TGU"
        ? "tegucigalpa"
        : "sin-clasificar";

    // 🔸 URL del endpoint de tu panel (ajústala si usás otro dominio)
    const url = `https://panel.arbeauty.com/api/chats/clasificar`;

    // Enviamos la actualización al panel
    await axios.post(url, { telefono, pestaña });

    console.log(`📁 Chat ${telefono} movido a la pestaña: ${pestaña}`);
  } catch (err) {
    console.error("⚠️ Error clasificando chat:", err.response?.data || err.message);
  }
}


export default router;

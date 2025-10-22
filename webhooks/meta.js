// 🟣 meta.js — corrección de emisión al panel CRM ARBEAUTY

import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";

const router = express.Router();

const VERIFY_TOKEN = "arbeauty_verify_token";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const sessionsPath = path.resolve("./webhooks/sessions.json");

function loadSessions() {
  try {
    const data = fs.readFileSync(sessionsPath, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

let sessions = loadSessions();

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

router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const io = req.app.get("io");

    if (data.object) {
      const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const from = message?.from;
      const name = message?.profile?.name || "Cliente";

      if (!message) return res.sendStatus(200);

      const BOT_NUMBER_ID = "50487497304";
      if (from === BOT_NUMBER_ID) return res.sendStatus(200);

      if (!sessions[from]) {
        sessions[from] = {
          name,
          step: "inicio",
          ciudad: null,
          lastMessage: null,
        };
        saveSessions(sessions);
      }

      const session = sessions[from];
      let textoRecibido = "";

      // Interactivo (botón)
      if (message?.interactive?.button_reply?.id) {
        const selected = message.interactive.button_reply.id;
        if (session.step === "esperando_zona") {
          let ciudad = "";
          if (selected === "sps") ciudad = "San Pedro Sula";
          else if (selected === "tgu") ciudad = "Tegucigalpa";
          else ciudad = "Otra ciudad";

          session.ciudad = ciudad;
          session.step = "menu_principal";
          saveSessions(sessions);

          textoRecibido = `📍 ${name} seleccionó: ${ciudad}`;
          await sendTextMessage(from, `Perfecto ${name} 💖, te atenderemos desde nuestra sucursal de ${ciudad}.`);

          setTimeout(async () => {
            await sendMainMenu(from, name);
          }, 1500);
        }
      }

      // Texto normal
      else if (message?.type === "text") {
        const text = message.text.body.trim();
        textoRecibido = text;

        if (session.step === "inicio") {
          if (!session.ciudad) {
            session.step = "esperando_zona";
            saveSessions(sessions);
            await sendWelcomeButtons(from, name);
          } else {
            session.step = "menu_principal";
            saveSessions(sessions);
            await sendMainMenu(from, name);
          }
        } else if (session.step === "menu_principal") {
          if (text.toLowerCase().includes("gracias")) {
            await sendTextMessage(from, `Con gusto ${name} 💕 ¿Deseas ver nuestras promociones o buscar un producto?`);
          } else {
            await sendTextMessage(from, `✨ Entendido ${name}. Pronto podré mostrarte precios actualizados directamente de arbeautyhn.com 💖`);
          }
        }
      }

      // 📤 Emitir al panel en tiempo real
      const ciudadAsignada = session.ciudad || "Sin clasificar";

      io.emit("nuevoMensaje", {
        de: "cliente",
        nombre: name,
        telefono: from,
        texto: textoRecibido,
        ciudad: ciudadAsignada,
        fecha: new Date().toLocaleString("es-HN"),
      });

      console.log(`📬 Mensaje de ${name} (${ciudadAsignada}): ${textoRecibido}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error procesando mensaje:", error.message);
    res.sendStatus(500);
  }
});

// --- Funciones auxiliares ---
async function sendWelcomeButtons(to, name) {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `💖 Hola ${name}, bienvenida a ARBEAUTY!\nEl paraíso del skincare coreano y japonés ✨🇰🇷🇯🇵\n\n🌸 Cuéntanos desde dónde nos escribes para atenderte mejor:`,
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "sps", title: "San Pedro Sula" } },
          { type: "reply", reply: { id: "tgu", title: "Tegucigalpa" } },
          { type: "reply", reply: { id: "otra", title: "Otra ciudad" } },
        ],
      },
    },
  };
  await axios.post("https://graph.facebook.com/v19.0/807852259084079/messages", body, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
}

async function sendTextMessage(to, text) {
  await axios.post(
    "https://graph.facebook.com/v19.0/807852259084079/messages",
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    },
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
}

async function sendMainMenu(to, name) {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `🌸 ${name}, ¿qué te gustaría hacer hoy?\n\n1️⃣ Ver productos\n2️⃣ Asesoría de rutina\n3️⃣ Promociones del día 💕`,
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "ver_productos", title: "Ver productos" } },
          { type: "reply", reply: { id: "asesoria", title: "Asesoría" } },
          { type: "reply", reply: { id: "promos", title: "Promociones" } },
        ],
      },
    },
  };
  await axios.post("https://graph.facebook.com/v19.0/807852259084079/messages", body, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
}

export default router;

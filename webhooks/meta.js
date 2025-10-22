// 🟣 meta.js — arbeauty-chatbot (v19 stable)

import express from "express";
import axios from "axios";

const router = express.Router();

// 🔹 CONFIGURACIONES
const VERIFY_TOKEN = "arbeauty_verify_token";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🔹 Memoria temporal para sesiones (por número)
const sessions = {};

// 🔹 Verificación del webhook de Meta
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente en Render");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 🔹 Procesamiento de mensajes entrantes
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const io = req.app.get("io");

    if (!data.entry || !data.entry[0]?.changes) return res.sendStatus(200);

    const change = data.entry[0].changes[0];
    const value = change?.value || {};
    const message = value?.messages?.[0];
    const from = message?.from;
    const name = value?.contacts?.[0]?.profile?.name || "bella";

    if (!message || !from) return res.sendStatus(200);

    console.log("📦 WEBHOOK RECIBIDO:", message);

    // 🧠 Evitar eco del bot
    const BOT_NUMBER_ID = "50488432478"; // Tu número de bot sin '+'
    if (from === BOT_NUMBER_ID) {
      console.log("🧩 Ignorado mensaje propio (eco del bot)");
      return res.sendStatus(200);
    }

    // Crear sesión si no existe
    if (!sessions[from]) {
      sessions[from] = { step: "inicio" };
    }

    // Guardar número de teléfono y preparar mensaje
    sessions[from].telefono = from;
    const session = sessions[from];
    let textoRecibido = "";

    // 🧩 Si el mensaje viene de un botón interactivo
    if (message?.interactive?.button_reply?.id) {
      const selected = message.interactive.button_reply.id;

      if (session.step === "esperando_zona") {
        let ciudad = "";

        if (selected === "sps") ciudad = "San Pedro Sula";
        else if (selected === "tgu") ciudad = "Tegucigalpa";
        else ciudad = "Otra ciudad";

        session.ciudad = ciudad;
        session.step = "menu_principal";

        textoRecibido = `📍 ${name} seleccionó: ${ciudad}`;

        await sendTextMessage(
          from,
          `Perfecto ${name} 💖, te atenderemos desde nuestra sucursal de ${ciudad}.`
        );

        setTimeout(async () => {
          await sendMainMenu(from, name);
        }, 1500);
      }
    }

    // 🧩 Si el mensaje es texto normal
    else if (message?.type === "text") {
      textoRecibido = message.text.body.trim();

      if (session.step === "inicio") {
        session.step = "esperando_zona";
        await sendWelcomeButtons(from, name);
      } else if (session.step === "menu_principal") {
        if (textoRecibido.toLowerCase().includes("gracias")) {
          await sendTextMessage(
            from,
            `Con gusto ${name} 💕 ¿Deseas ver nuestras promociones o buscar un producto?`
          );
        } else if (
          textoRecibido.toLowerCase().includes("hola") ||
          textoRecibido.toLowerCase().includes("buenas")
        ) {
          await sendTextMessage(
            from,
            `Hola ${name} 🌸 ¡Ya estás con ARBEAUTY! ¿Quieres que te muestre los productos más populares o tu rutina ideal?`
          );
        } else {
          await sendTextMessage(
            from,
            `✨ Entendido ${name}. Pronto podré reconocer productos por nombre y mostrarte precios actualizados directamente de nuestra tienda arbeautyhn.com 💖`
          );
        }
      }
    }

    // 🧠 Emitir mensaje al panel web (texto real y confirmado)
    const textoFinal = message?.text?.body || textoRecibido || "";
    if (textoFinal.trim() !== "") {
      console.log("📢 Enviando al panel:", textoFinal);
      io.emit("nuevoMensaje", {
        de: "cliente",
        nombre: name,
        telefono: from,
        texto: textoFinal,
        fecha: new Date().toLocaleString("es-HN"),
      });
    } else {
      console.log("⚠️ Mensaje vacío, no se emitió al panel");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(
      "❌ Error procesando mensaje:",
      error.response?.data || error.message
    );
    res.sendStatus(500);
  }
});

// 🔹 Enviar mensaje con botones de bienvenida
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

  await axios.post(
    "https://graph.facebook.com/v19.0/807852259084079/messages",
    body,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// 🔹 Enviar texto simple
async function sendTextMessage(to, text) {
  await axios.post(
    "https://graph.facebook.com/v19.0/807852259084079/messages",
    {
      messaging_product: "whatsapp",
      to,
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// 🔹 Enviar menú principal
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

  await axios.post(
    "https://graph.facebook.com/v19.0/807852259084079/messages",
    body,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// 🔹 Enviar mensaje manual desde el panel
router.post("/enviar", async (req, res) => {
  try {
    const { mensaje, telefono } = req.body;

    if (!mensaje) {
      return res.status(400).json({ error: "Falta el mensaje a enviar" });
    }

    // ✅ Buscar número destino en la sesión más reciente o usar el que venga en la solicitud
    const numeroDestino =
      telefono || Object.values(sessions).slice(-1)[0]?.telefono;

    if (!numeroDestino) {
      return res
        .status(400)
        .json({ error: "No hay sesión activa o número destino" });
    }


    await axios.post(
      "https://graph.facebook.com/v19.0/807852259084079/messages",
      {
        messaging_product: "whatsapp",
        to: numeroDestino,
        text: { body: mensaje },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`📤 Mensaje enviado a ${numeroDestino}: ${mensaje}`);

    const io = req.app.get("io");
    io.emit("nuevoMensaje", {
      de: "bot",
      nombre: "ARBEAUTY",
      texto: mensaje,
      fecha: new Date().toLocaleString("es-HN"),
    });

    res.sendStatus(200);
  } catch (error) {
    console.error(
      "❌ Error enviando mensaje:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Error enviando mensaje a WhatsApp" });
  }
});

export default router;

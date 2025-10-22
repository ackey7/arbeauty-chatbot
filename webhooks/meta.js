// 🟣 meta.js — arbeauty-chatbot

import express from "express";
import axios from "axios";

const router = express.Router();

// 🔹 CONFIGURACIONES
const VERIFY_TOKEN = "arbeauty_verify_token";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🔹 Memoria temporal para sesiones (almacena estado por número)
const sessions = {};

// 🔹 Verificación del webhook de Meta
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

// 🔹 Procesamiento de mensajes entrantes
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    const io = req.app.get("io"); // obtenemos la instancia del socket

    if (data.object) {
      const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const from = message?.from;
      const name = message?.profile?.name || "bella";

      if (!message) return res.sendStatus(200); // ignorar mensajes vacíos

      // 🧠 Evitar duplicados (mensajes enviados por el mismo bot)
      const BOT_NUMBER_ID = "50487497304"; // <-- coloca aquí tu número de teléfono del bot (sin +)
      if (from === BOT_NUMBER_ID) {
        console.log("🧩 Ignorado mensaje propio (eco del bot)");
        return res.sendStatus(200);
      }

      // Si no hay sesión previa, la creamos
      if (!sessions[from]) {
        sessions[from] = { step: "inicio" };
      }

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
        const text = message.text.body.trim();
        textoRecibido = text;

        if (session.step === "inicio") {
          session.step = "esperando_zona";
          await sendWelcomeButtons(from, name);
        } else if (session.step === "menu_principal") {
          if (text.toLowerCase().includes("gracias")) {
            await sendTextMessage(
              from,
              `Con gusto ${name} 💕 ¿Deseas ver nuestras promociones o buscar un producto?`
            );
          } else if (
            text.toLowerCase().includes("hola") ||
            text.toLowerCase().includes("buenas")
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

      // 🧠 Emitir mensaje al frontend en tiempo real
      if (textoRecibido) {
        io.emit("nuevoMensaje", {
          de: "cliente",
          nombre: name,
          telefono: from,
          texto: textoRecibido,
          fecha: new Date().toLocaleString("es-HN"),
        });
      }
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

// 🔹 Función: enviar mensaje con botones de bienvenida
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

// 🔹 Función: enviar texto simple
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

// 🔹 Función: mostrar menú principal después de elegir ciudad
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

// 🔹 Ruta para enviar mensajes manuales desde el panel web
router.post("/enviar", async (req, res) => {
  try {
    const { mensaje, telefono } = req.body;

    // Validar que haya texto
    if (!mensaje) {
      return res.status(400).json({ error: "Falta el mensaje a enviar" });
    }

    // Si no se especifica número, toma el último que escribió (última sesión activa)
    const ultimoNumero = Object.keys(sessions).pop();
    const numeroDestino = telefono || ultimoNumero;

    if (!numeroDestino) {
      return res
        .status(400)
        .json({ error: "No hay sesión activa para enviar mensaje" });
    }

    // Enviar mensaje a WhatsApp
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

    // Emitirlo también al panel como mensaje del bot
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
    res
      .status(500)
      .json({ error: "Error enviando mensaje a WhatsApp" });
  }
});

export default router;

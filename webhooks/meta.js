// 🟣 webhooks/meta.js — arbeauty-chatbot (versión con protección contra ecos por caché)

// Nota: este archivo reemplaza al que tenías. Pégalo tal cual.

import express from "express";
import axios from "axios";

const router = express.Router();

// 🔹 CONFIGURACIONES
const VERIFY_TOKEN = "arbeauty_verify_token";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

// 🔹 Memoria temporal para sesiones (almacena estado por número)
const sessions = {};

// 🔹 Cache temporal para mensajes salientes (evitar eco/duplicado en panel)
// Estructura: { "<telefono>": [{ text, ts }] }
const recentOutbound = {};
const OUTBOUND_WINDOW_MS = 12 * 1000; // ventana para considerar eco (12s)

// Helper: limpiar entradas viejas
function cleanRecentOutbound() {
  const now = Date.now();
  for (const key of Object.keys(recentOutbound)) {
    recentOutbound[key] = recentOutbound[key].filter(
      (e) => now - e.ts <= OUTBOUND_WINDOW_MS
    );
    if (recentOutbound[key].length === 0) delete recentOutbound[key];
  }
}

// Helper: registrar outbound
function registerOutbound(to, text) {
  cleanRecentOutbound();
  if (!recentOutbound[to]) recentOutbound[to] = [];
  recentOutbound[to].push({ text: String(text).trim(), ts: Date.now() });
}

// Helper: verificar si incoming coincide con un outbound reciente
function isLikelyOutboundEcho(from, text) {
  cleanRecentOutbound();
  const arr = recentOutbound[from];
  if (!arr || !arr.length) return false;
  const incoming = String(text).trim();
  // buscamos coincidencia exacta de texto en ventana temporal (puede ajustarse)
  for (const entry of arr) {
    if (entry.text === incoming) {
      return true;
    }
  }
  return false;
}

// 🔹 Verificación del webhook de Meta
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente en Render (puerto 10000)");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// 🔹 Procesamiento de mensajes entrantes
router.post("/", async (req, res) => {
  try {
    // DEBUG ligero (puede quedar por unos minutos)
    // console.log("📬 Webhook body preview:", JSON.stringify(req.body).slice(0, 1000));

    const data = req.body;
    const io = req.app.get("io"); // instancia del socket

    if (!data || !data.object) {
      return res.sendStatus(200);
    }

    const entry = data.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];
    const from = message?.from;
    const name = message?.profile?.name || "bella";

    // Si no hay message (puede ser 'status' o algún otro evento), lo manejamos separadamente
    const statuses = changes?.statuses || null;
    if (!message && Array.isArray(statuses) && statuses.length > 0) {
      // Es un update de estado (entregado/ leído / etc.) — ignorar
      console.log("ℹ️ Status update recibido, no es mensaje cliente:", JSON.stringify(statuses).slice(0, 200));
      return res.sendStatus(200);
    }

    if (!message) {
      return res.sendStatus(200);
    }

    // Si el message no tiene texto, puede ser interactive, sticker, etc. seguimos procesando
    // Evitar procesar si es un status dentro de message (caso raro)
    if (message?.status) {
      console.log("ℹ️ Mensaje con campo status (confirmación) recibido, se ignora.");
      return res.sendStatus(200);
    }

    // Detectar si este incoming es eco de algo que nosotros acabamos de enviar desde el panel
    let incomingText = "";
    if (message?.type === "text") incomingText = message.text.body || "";
    else if (message?.interactive?.button_reply?.id) {
      // normalizamos un texto representativo para comparar
      incomingText = message.interactive.button_reply.id;
    } else {
      // otros tipos (attachments, image, etc.) use a descriptive string
      incomingText = message?.type || "";
    }

    const wasOutboundEcho = isLikelyOutboundEcho(from, incomingText);

    if (wasOutboundEcho) {
      console.log("🧩 Ignorado echo detectado por coincidencia con outbound reciente ->", { from, incomingText });
      // Lo ignoramos para que no se muestre doble en el panel
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
    } else {
      // Tipos no-textuales: opcionalmente emitir un mensaje informativo al panel
      textoRecibido = `[${message.type}]`;
    }

    // 🧠 Emitir mensaje al frontend (panel) en tiempo real
    if (textoRecibido) {
      io.emit("nuevoMensaje", {
        de: "cliente",
        nombre: name,
        telefono: from,
        texto: textoRecibido,
        fecha: new Date().toLocaleString("es-HN"),
      });
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error(
      "❌ Error procesando mensaje:",
      error.response?.data || error.message
    );
    return res.sendStatus(500);
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
  const payload = {
    messaging_product: "whatsapp",
    to,
    text: { body: text },
  };

  // registramos en la caché que enviamos esto (para detectar eco)
  try {
    registerOutbound(to, text);
  } catch (e) {
    // no crítico si falla la cache
    console.warn("⚠️ registerOutbound fallo:", e?.message || e);
  }

  await axios.post(
    "https://graph.facebook.com/v19.0/807852259084079/messages",
    payload,
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

  // registramos la llamada a sendMainMenu como outbound (texto corto)
  try {
    registerOutbound(to, "menu_principal");
  } catch (e) {}

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

    if (!mensaje) {
      return res.status(400).json({ error: "Falta el mensaje a enviar" });
    }

    const ultimoNumero = Object.keys(sessions).pop();
    const numeroDestino = telefono || ultimoNumero;

    if (!numeroDestino) {
      return res
        .status(400)
        .json({ error: "No hay sesión activa para enviar mensaje" });
    }

    // registramos en cache que mandamos este mensaje (esto evitará el eco)
    try {
      registerOutbound(numeroDestino, mensaje);
    } catch (e) {
      console.warn("⚠️ registerOutbound fallo:", e?.message || e);
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

import express from "express";
import axios from "axios";
const router = express.Router();

// 🔹 CONFIGURACIÓN
const VERIFY_TOKEN = "arbeauty_verify_token";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // ⚠️ Reemplazá esto con tu token real

// ✅ VERIFICACIÓN DEL WEBHOOK
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

// ✅ RECEPCIÓN DE MENSAJES
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    if (data.object) {
      const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const from = message?.from;
      const name = message?.profile?.name || "bella";

      // 🔹 Si el mensaje viene de un botón
      if (message?.interactive?.button_reply?.id) {
        const selected = message.interactive.button_reply.id;
        let ciudad = "";

        if (selected === "sps") ciudad = "San Pedro Sula";
        else if (selected === "tgu") ciudad = "Tegucigalpa";
        else ciudad = "Otra ciudad";

        console.log(`📍 Cliente ${name} ubicado en: ${ciudad}`);

        await sendTextMessage(from, `Perfecto ${name} 💖, te atenderemos desde nuestra sucursal de ${ciudad}.`);
      }

      // 🔹 Si el cliente envía el primer mensaje
      else if (message?.type === "text") {
        await sendWelcomeButtons(from, name);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error procesando mensaje:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🔹 FUNCIÓN PARA ENVIAR MENSAJE CON BOTONES
async function sendWelcomeButtons(to, name) {
  const body = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `💖 Hola ${name}, bienvenida a ARBEAUTY!\nEl paraíso del skincare coreano y japonés ✨🇰🇷🇯🇵\n\n🌸 Cuéntanos desde dónde nos escribes para atenderte mejor:`
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "sps", title: "San Pedro Sula" } },
          { type: "reply", reply: { id: "tgu", title: "Tegucigalpa" } },
          { type: "reply", reply: { id: "otra", title: "Otra ciudad" } }
        ]
      }
    }
  };

  await axios.post(`https://graph.facebook.com/v19.0/807852259084079/messages`, body, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

// 🔹 FUNCIÓN PARA ENVIAR MENSAJES DE TEXTO
async function sendTextMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v19.0/807852259084079/messages`,
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

export default router;

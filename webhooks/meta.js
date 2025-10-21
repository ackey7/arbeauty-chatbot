import express from "express";

const router = express.Router();

// Verificación inicial con Meta (cuando configures el webhook)
router.get("/", (req, res) => {
  const VERIFY_TOKEN = "arbeauty_token"; // puedes cambiarlo
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente con Meta");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recepción de mensajes desde WhatsApp
router.post("/", (req, res) => {
  console.log("📩 Mensaje recibido:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// 👇 ESTA LÍNEA ES LA CLAVE
export { router };

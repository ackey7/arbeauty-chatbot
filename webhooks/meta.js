import express from "express";

const router = express.Router();

// ✅ Ruta de verificación del webhook de Meta
router.get("/", (req, res) => {
  const VERIFY_TOKEN = "arbeauty_token";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente por Meta");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Error en la verificación del webhook");
    res.sendStatus(403);
  }
});

// ✅ Ruta para recibir mensajes de WhatsApp
router.post("/", (req, res) => {
  console.log("📩 Mensaje recibido:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// 👇 ESTA LÍNEA ES LA CLAVE
export default router;

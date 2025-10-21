import express from "express";
import bodyParser from "body-parser";
import { router as metaRouter } from "./webhooks/meta.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Webhook de Meta (WhatsApp)
app.use("/webhook/meta", metaRouter);

app.get("/", (req, res) => {
  res.send("Servidor de ARBEAUTY funcionando 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

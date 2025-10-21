import express from "express";
import bodyParser from "body-parser";
import metaRouter from "./webhooks/meta.js";

const app = express();
app.use(bodyParser.json());

// 🔹 Conectamos el router de Meta
app.use("/webhooks/meta", metaRouter);

// 🔹 Ruta base de prueba
app.get("/", (req, res) => {
  res.send("Servidor ARBEAUTY activo 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

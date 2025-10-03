// src/app.js
import express from "express";
import dotenv from "dotenv";
import shopifyWebhook from "./routes/shopifyWebhook.js";
import webhookRoutes from "./routes/webhookRoutes.js"; // WhatsApp + endpoints extra (PDFs opcional)

dotenv.config();

const app = express();

// ⚠️ RAW SOLO para Shopify (HMAC necesita el cuerpo EXACTO)
app.use("/webhooks/shopify", express.raw({ type: "application/json" }));

// ✅ JSON para TODO lo demás (después del raw de Shopify)
app.use(express.json({ limit: "1mb" }));

// Monta rutas
app.use("/webhooks/shopify", shopifyWebhook);
app.use("/", webhookRoutes);

// Healthcheck
app.get("/", (_req, res) => {
  res.status(200).send("<pre>Servidor NATIF activo 🚀</pre>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});

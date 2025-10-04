// ⚠️ Solución al error DOMMatrix no definido en pdf-parse
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor() { }
    multiply() { return this; }
    invertSelf() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
  };
}

import express from "express";
import dotenv from "dotenv";
import shopifyWebhook from "./routes/shopifyWebhook.js";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();

// BODY CRUDO SOLO para webhooks de Shopify (requerido para HMAC)
app.use("/webhooks/shopify", express.raw({ type: "application/json" }));

// JSON para TODO lo demás
app.use((req, res, next) => {
  if (req.path.startsWith("/webhooks/shopify")) return next();
  return express.json({ limit: "1mb" })(req, res, next);
});

// Rutas
app.use("/webhooks/shopify", shopifyWebhook);
app.use("/", webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is listening on port: ${PORT}`));

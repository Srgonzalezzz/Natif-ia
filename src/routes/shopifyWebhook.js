// src/routes/shopifyWebhook.js
import express from "express";
import crypto from "crypto";
import whatsappService from "../services/whatsappService.js";

const router = express.Router();

/** Verifica HMAC con el cuerpo CRUDO (Buffer). */
function verifyShopifyWebhook(req, secret) {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  if (!secret || !hmacHeader) return {valid:false, hmacHeader, digest:null};

  const digest = crypto
    .createHmac("sha256", secret)
    .update(req.body) // Buffer sin encodings extra
    .digest("base64");

  const sameLen =
    Buffer.byteLength(hmacHeader) === Buffer.byteLength(digest);
  const valid = sameLen && crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(digest)
  );

  return {valid, hmacHeader, digest};
}


/** Normaliza teléfono → E.164 para WhatsApp Cloud (sin '+'). */
function normalizarTelefono(rawPhone) {
  if (!rawPhone) return null;
  let phone = String(rawPhone).trim().replace(/\s+/g, "");
  phone = phone.replace(/[^\d+]/g, "");
  if (phone.startsWith("0")) phone = "+57" + phone.slice(1);
  if (!phone.startsWith("+")) phone = "+57" + phone;
  // Cloud API suele esperar sin '+'
  return phone.replace(/^\+/, "");
}

/** Fulfillment: pedido empacado / despachado (ej: fulfillments/create). */
router.post("/order-fulfilled", async (req, res) => {
  // 👈 NO uses express.json() aquí; ya tenemos raw a nivel de app
  if (!verifyShopifyWebhook(req, process.env.SHOPIFY_SECRET)) {
    console.warn("Webhook fulfillment con HMAC inválido");
    return res.status(401).send("Unauthorized");
  }

  res.sendStatus(200); // responde rápido a Shopify

  try {
    const data = JSON.parse(req.body.toString("utf8"));
    console.log("📦 Webhook fulfillment:", JSON.stringify(data, null, 2));

    const orderId = data?.order_number || data?.id;
    const status = data?.fulfillment_status;
    const customer = data?.customer;

    if (
      status === "fulfilled" ||
      String(status || "").toLowerCase() === "preparado"
    ) {
      const numeroCliente = normalizarTelefono(
        customer?.phone || customer?.default_address?.phone
      );
      if (numeroCliente) {
        await whatsappService.sendMessage(
          numeroCliente,
          `🩷¡Hola, ${customer?.first_name || ""} te hablamos de NATIF🍫, es un placer saludarte el dia de hoy.🤎! \n Te queremos informar que tu pedido con numero de orden #${orderId} fue despachado y estará en camino muy pronto 🙌`
        );
      } else {
        console.warn("No hay teléfono para cliente en fulfillment webhook");
      }
    }
  } catch (err) {
    console.error("Error procesando fulfillment webhook:", err);
  }
});

/** Order updated: guía creada / tracking actualizado (ej: orders/updated). */
router.post("/order-updated", async (req, res) => {
  const {valid, hmacHeader, digest} = verifyShopifyWebhook(req, process.env.SHOPIFY_SECRET);

  if (!valid) {
    console.warn("Webhook tracking con HMAC inválido");
    console.log('HMAC recibido:', hmacHeader);
    console.log('HMAC calculado:', digest);
    return res.status(401).send("Unauthorized");
  }

  res.sendStatus(200);

  try {
    const data = JSON.parse(req.body.toString("utf8"));
    // ...
  } catch (err) {
    console.error("Error procesando order update webhook:", err);
  }
});


export default router;

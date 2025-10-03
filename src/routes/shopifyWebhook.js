import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

/** --- Utils --- **/
function getRawBodyForHmac(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
  return Buffer.from(JSON.stringify(req.body || {}), "utf8");
}

function verifyShopifyWebhook(req, secret) {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256") || "";
  if (!secret || !hmacHeader) return { valid: false };
  const raw = getRawBodyForHmac(req);
  const digest = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  const valid =
    Buffer.byteLength(hmacHeader) === Buffer.byteLength(digest) &&
    crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
  return { valid, digest, hmacHeader };
}

async function sendEmail({ to, subject, text }) {
  if (!to) return;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
  console.log(`📧 Email enviado a ${to}: ${subject}`);
}

function obtenerCorreo(order) {
  return order?.contact_email || order?.email || order?.customer?.email || "";
}

/** --- Webhook fulfillments --- **/
router.post("/fulfillments-update", async (req, res) => {
  const { valid } = verifyShopifyWebhook(req, process.env.SHOPIFY_SECRET);
  if (!valid) return res.status(401).send("Unauthorized");
  res.sendStatus(200);

  try {
    const order = JSON.parse(getRawBodyForHmac(req).toString("utf8"));
    console.log("🚚 fulfillments/update:", order.name);

    const correoCliente = obtenerCorreo(order);
    const orderLabel = order?.name || order?.order_number;

    for (const fulfillment of order.fulfillments || []) {
      const guia =
        fulfillment?.tracking_number || fulfillment?.tracking_numbers?.[0] || "";
      const link =
        fulfillment?.tracking_url || fulfillment?.tracking_urls?.[0] || "";
      const empresa = fulfillment?.tracking_company || "Transportadora";
      const status = fulfillment?.status || "";

      // Caso 1: Guía creada
      if (guia) {
        await sendEmail({
          to: correoCliente,
          subject: `Tu pedido ${orderLabel} ya está en camino`,
          text: `🚚 ¡Tu pedido con orden ${orderLabel} ya está en camino!\n\n📦 Guía: ${guia}\n🏢 Transportadora: ${empresa}\n🔗 Rastreo: ${link}\n\n¡Gracias por tu compra! 🍫 COMER SANO NUNCA FUE TAN RICO 🤎🩷`,
        });
      }
      // Caso 2: Cancelado
      else if (status === "cancelled") {
        await sendEmail({
          to: correoCliente,
          subject: `Tu pedido ${orderLabel} ha sido cancelado`,
          text: `⚠️ Lamentamos informarte que tu pedido con número ${orderLabel} ha sido **cancelado**. Si tienes dudas contáctanos.`,
        });
      }
      // Caso 3: Preparado/Despachado sin guía
      else if (status === "success" || status === "fulfilled") {
        await sendEmail({
          to: correoCliente,
          subject: `Tu pedido ${orderLabel} fue preparado y despachado`,
          text: `🩷 ¡Hola! Tu pedido con número de orden ${orderLabel} ya fue **preparado y pronto se hara tu guia de despacho** 🚀.\nPronto te enviaremos la guía para rastrearlo 🙌`,
        });
      }
      // Caso 4: En proceso
      else if (status === "pending" || status === "in_progress") {
        await sendEmail({
          to: correoCliente,
          subject: `Tu pedido ${orderLabel} está en preparación`,
          text: `🔄 Tu pedido con número ${orderLabel} se encuentra actualmente **en preparación**. Te notificaremos cuando esté despachado 🚀`,
        });
      } else {
        console.log(`Fulfillment ${fulfillment.name} con estado ${status} sin email`);
      }
    }
  } catch (err) {
    console.error("Error procesando fulfillments/update:", err);
  }
});

export default router;

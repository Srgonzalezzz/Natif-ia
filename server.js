import express from "express";
import axios from "axios";
import 'dotenv/config';

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, API_TOKEN, business_phone, API_VERSION, PORT, BEARER_TOKEN } = process.env;

// Middleware para validar Bearer en tu webhook
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }
  const token = authHeader.split(" ")[1];
  if (token !== BEARER_TOKEN) {
    return res.status(403).json({ error: "Token inválido" });
  }
  next();
}

// 👉 Webhook que recibe mensajes
app.post("/webhook", authMiddleware, async (req, res) => {
  console.log("📩 Incoming webhook:", JSON.stringify(req.body, null, 2));

  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (message) {
    const senderPhoneNumber = message.from;
    const messageId = message.id;
    const messageText = message.text?.body || "Sin texto";

    try {
      // Responder con un mensaje automático
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/${business_phone}/messages`,
        {
          messaging_product: "whatsapp",
          to: senderPhoneNumber,
          text: { body: `👋 Hola! Recibí tu mensaje: "${messageText}" 🚀` },
          context: { message_id: messageId }
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      // Marcar como leído
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/${business_phone}/messages`,
        {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log(`✅ Respondí a ${senderPhoneNumber}`);
    } catch (error) {
      console.error("❌ Error enviando mensaje:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

// 👉 Verificación inicial con Meta
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    console.log("Webhook verificado con éxito ✅");
  } else {
    res.sendStatus(403);
  }
});

// Ruta raíz
app.get("/", (req, res) => {
  res.send(`<pre>Servidor NATIF activo 🚀</pre>`);
});

app.listen(PORT || 3000, () => {
  console.log(`🚀 Server escuchando en puerto: ${PORT || 3000}`);
});

import express from "express";
import axios from "axios";
import 'dotenv/config';
import messageHandler from './src/services/messageHandler.js'; // ajusta ruta según tu proyecto

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
    const senderInfo = {
      nombre: value?.contacts?.[0]?.profile?.name || '',
      numero: message.from,
      profile: value?.contacts?.[0]?.profile || {}
    };

    try {
      // 👇 Aquí delegas la lógica a tu IA
      await messageHandler.handleIncomingMessage(message, senderInfo);

      console.log(`✅ Procesado por IA para ${senderInfo.numero}`);
    } catch (error) {
      console.error("❌ Error en MessageHandler:", error.message);
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

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server escuchando en puerto: ${port}`);
});

import express from "express";

const router = express.Router();

// ⚠️ token de verificación desde .env
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

// Meta envía GET para verificar
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado con éxito ✅");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Meta envía POST con mensajes
router.post("/webhook", (req, res) => {
  console.log("Evento entrante", JSON.stringify(req.body, null, 2));
  // Aquí procesas mensajes entrantes...
  return res.sendStatus(200);
});

export default router;

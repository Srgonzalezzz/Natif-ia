import express from "express";
import axios from "axios";
import 'dotenv/config';

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, API_TOKEN, business_phone, API_VERSION, PORT } = process.env;

app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (message?.type === "text") {
    const senderPhoneNumber = message.from;
    const messageText = message.text.body;
    const messageId = message.id;

    try {
      // Enviar respuesta
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/${business_phone}/messages`,
        {
          messaging_product: "whatsapp",
          to: senderPhoneNumber,
          text: { body: messageText },  // Aquí se retorna el mismo mensaje
          context: { message_id: messageId }
        },
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      // Marcar el mensaje como leído
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
    } catch (error) {
      console.error("Error sending message:", error.response?.data || error.message);
    }
  }

  res.sendStatus(200);
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    res.sendStatus(403);
  }
});

app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.\nCheckout README.md to start.</pre>`);
});

app.listen(PORT, () => {
  console.log(`Server is listening on port: ${PORT}`);
});

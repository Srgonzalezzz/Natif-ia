// src/services/handlers/handleMediaMessage.js
import whatsappService from '../whatsappService.js';
import { guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';
import { sendWelcomeMenu } from "./menuHandler.js";
import { getEstado, resetEstado } from '../../utils/stateManager.js';

// ----------------------
// Helpers internos
// ----------------------
async function registrarReclamo(userId, senderInfo, reclamo, tipo) {
  await guardarReclamoEnSheet({
    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    cliente: senderInfo?.name || "Desconocido",
    numero: userId,
    reclamo,
    tipo,
    estado: "Nuevo",
  });
  await resetEstado(userId);
  await sendWelcomeMenu(userId);
}

// ----------------------
// Handler principal
// ----------------------
export default async function handleMediaMessage(message, userId, senderInfo) {
  const estado = await getEstado(userId) || {};

  switch (estado.subestado) {
    case "esperando_foto_equivocado":
      if (message.type === "image") {
        await whatsappService.sendMessage(userId, "✅ Recibimos la foto de tu producto equivocado. Nuestro equipo revisará el caso.");
        await registrarReclamo(userId, senderInfo, "Producto equivocado", "Imagen");
      } else {
        await whatsappService.sendMessage(userId, "❌ Por favor envíame una foto del producto.");
      }
      break;

    case "esperando_foto_danado":
      if (["image", "video"].includes(message.type)) {
        await whatsappService.sendMessage(userId, "✅ Recibimos tu evidencia (foto/video) del producto dañado. Lo estamos revisando.");
        await registrarReclamo(
          userId,
          senderInfo,
          "Producto dañado",
          message.type === "image" ? "Imagen" : "Video"
        );
      } else {
        await whatsappService.sendMessage(userId, "❌ Necesitamos una foto o video del producto dañado.");
      }
      break;

    case "esperando_texto_incompleto":
      if (message.type === "text") {
        const faltante = message.text.body;
        await whatsappService.sendMessage(userId, `✅ Recibimos tu reporte: "${faltante}". Gracias por informarnos, lo solucionaremos pronto.`);
        await registrarReclamo(userId, senderInfo, `Pedido incompleto - Faltó: ${faltante}`, "Texto");
      } else {
        await whatsappService.sendMessage(userId, "Por favor indícanos por texto qué producto faltó en tu pedido.");
      }
      break;

    default:
      await whatsappService.sendMessage(userId, "⚠️ Recibí tu archivo, pero no sé cómo procesarlo en este contexto.");
      break;
  }
}

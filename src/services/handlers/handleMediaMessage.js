import whatsappService from '../whatsappService.js';
import { guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';
import { sendWelcomeMenu } from "./menuHandler.js";
import { getEstado, resetEstado } from '../../utils/stateManager.js';
import { procesarMedia } from '../../utils/processMedia.js';

const SUPERVISOR_NUMBER = process.env.SUPERVISOR_NUMBER || '573015972410';

async function notificarSupervisor(senderInfo, userId, reclamo, tipo, evidenciaUrl) {
  const nombreCliente = senderInfo?.profile?.name || senderInfo?.name || userId;
  const mensaje = `📢 Nuevo reclamo detectado:\n\n👤 Cliente: *${nombreCliente}*\n📞 WhatsApp: ${userId}\n📝 Reclamo: ${reclamo}\n📂 Tipo: ${tipo}${evidenciaUrl ? `\n🔗 Evidencia: ${evidenciaUrl}` : ""}`;
  await whatsappService.sendMessage(SUPERVISOR_NUMBER, mensaje);
}

async function registrarReclamo(userId, senderInfo, reclamo, tipo, evidenciaUrl = "") {
  const nombreCliente = senderInfo?.profile?.name || senderInfo?.name || userId;
  await guardarReclamoEnSheet({
    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    cliente: nombreCliente,
    numero: userId,
    reclamo,
    tipo,
    estado: "Nuevo",
    evidencia: evidenciaUrl
  });
  await notificarSupervisor(senderInfo, userId, reclamo, tipo, evidenciaUrl);
  await resetEstado(userId);
  await sendWelcomeMenu(userId);
}

export default async function handleMediaMessage(message, userId, senderInfo) {
  const estado = await getEstado(userId) || {};

  // Detectamos tipo y procesamos evidencia
  if (["esperando_foto_equivocado", "esperando_foto_danado", "esperando_texto_incompleto"].includes(estado.subestado)) {
    let tipoReclamo;
    switch (estado.subestado) {
      case "esperando_foto_equivocado":
        tipoReclamo = "Producto equivocado";
        break;
      case "esperando_foto_danado":
        tipoReclamo = "Producto dañado";
        break;
      case "esperando_texto_incompleto":
        tipoReclamo = "Pedido incompleto";
        break;
    }

    if (message.type === 'text') {
      const texto = message.text.body;
      await whatsappService.sendMessage(userId, `✅ Recibimos tu reporte: "${texto}". Gracias por informarnos, lo solucionaremos pronto.`);
      await registrarReclamo(userId, senderInfo, `${tipoReclamo} - Detalle: ${texto}`, "Texto");
      return;
    }

    if (message.type === 'image' || message.type === 'video') {
      const { tipo, evidenciaUrl } = await procesarMedia(message);
      await whatsappService.sendMessage(userId, `✅ Recibimos tu ${tipo.toLowerCase()} de ${tipoReclamo}. Lo estamos revisando.`);
      await registrarReclamo(userId, senderInfo, tipoReclamo, tipo, evidenciaUrl);
      return;
    }

    // si llega otro tipo no soportado
    await whatsappService.sendMessage(userId, "❌ Necesitamos una foto, video o texto sobre tu pedido para procesar el reclamo.");
    return;
  }

  // default
  await whatsappService.sendMessage(userId, "⚠️ Recibí tu archivo, pero no sé cómo procesarlo en este contexto.");
}

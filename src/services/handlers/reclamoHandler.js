import whatsappService from '../whatsappService.js';
import { guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js'
import { resetEstado } from '../../utils/stateManager.js';
import { sendWelcomeMenu } from '../handlers/menuHandler.js';

export async function manejarReclamoTexto(userId, texto, tipo, senderInfo) {
  const cliente = senderInfo?.name || 'Desconocido';
  await guardarReclamoEnSheet({
    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    cliente,
    numero: userId,
    reclamo: tipo,
    tipo: 'Texto',
    estado: 'Nuevo',
  });

  await whatsappService.sendMessage(userId, `✅ Hemos recibido tu mensaje sobre: "${texto}". Nuestro equipo lo revisará pronto.`);
  await resetEstado(userId);
  await sendWelcomeMenu(userId);
}

export async function manejarReclamoMedia(userId, message, estado, senderInfo) {
  const tipoReclamo = {
    esperando_foto_equivocado: 'Producto equivocado',
    esperando_foto_danado: 'Producto dañado',
    esperando_texto_incompleto: 'Pedido incompleto'
  }[estado.subestado];

  if (!tipoReclamo) {
    await whatsappService.sendMessage(userId, "⚠️ Recibí tu archivo, pero no sé cómo procesarlo.");
    return;
  }

  const tipoArchivo = message.type === 'image' ? 'Imagen' : (message.type === 'video' ? 'Video' : 'Otro');
  await guardarReclamoEnSheet({
    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    cliente: senderInfo?.name || 'Desconocido',
    numero: userId,
    reclamo: tipoReclamo,
    tipo: tipoArchivo,
    estado: 'Nuevo'
  });

  await whatsappService.sendMessage(userId, `✅ Recibimos tu evidencia de *${tipoReclamo}*. Lo estamos revisando.`);
  await resetEstado(userId);
  await sendWelcomeMenu(userId);
}

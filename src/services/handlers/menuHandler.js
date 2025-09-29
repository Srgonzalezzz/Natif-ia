// src/services/handlers/menuHandler.js
import whatsappService from '../whatsappService.js';
import { setEstado, deleteEstado, getEstado } from '../../utils/stateManager.js';
import { escalarReclamo } from '../handlers/soporteHandler.js';
import { setInactivityTimers, clearUserTimers } from '../timers.js';

// ----------------------
// Bienvenida
// ----------------------
export async function sendWelcomeMessage(to, senderInfo) {
  const name = senderInfo?.profile?.name || senderInfo?.wa_id || "Cliente";
  await whatsappService.sendMessage(
    to,
    `🌟 ¡Hola ${name}! Soy Nati🩷, de Natif. \nEstoy aquí para ayudarte con tus pedidos, compras o cualquier duda que tengas 😊`
  );
}

export async function sendWelcomeMenu(to) {
  const buttons = [
    { type: 'reply', reply: { id: 'opcion_1', title: 'ESTADO PEDIDO' } },
    { type: 'reply', reply: { id: 'opcion_2', title: 'QUEJA Y RECLAMO' } },
    { type: 'reply', reply: { id: 'opcion_3', title: 'PREGUNTAS FRECUENTES' } }
  ];
  await whatsappService.sendInteractiveButtons(to, "¿Cómo más puedo ayudarte el día de hoy?", buttons);
}

// ----------------------
// Opciones de menú
// ----------------------
export async function handleMenuOption(userId, option) {
  const lowerOpt = option.toLowerCase();

  if (lowerOpt.includes('estado') || lowerOpt.includes('pedido')) {
    await setEstado(userId, 'seguimiento', 'esperando_guia');
    return whatsappService.sendMessage(userId, 'Por favor, envíame tu número de guía para rastrear tu pedido 📦');
  }

  if (lowerOpt.includes('queja') || lowerOpt.includes('reclamo')) {
    await setEstado(userId, 'quejas_reclamos', 'esperando_detalle');
    return whatsappService.sendMessage(userId, '📝 Por favor cuéntame en un solo mensaje lo que pasó para poder redirigir tu caso a un asesor calificado a tu situación.');
  }

  if (lowerOpt.includes('pregunta') || lowerOpt.includes('frecuente')) {
    await setEstado(userId, 'ia', 'esperando_pregunta');
    setInactivityTimers(userId);
    return whatsappService.sendMessage(userId, 'Genial! Soy la IA NATIF y estoy aquí para ayudarte 🤖');
  }

  return whatsappService.sendMessage(userId, 'Lo siento, tu mensaje no fue claro');
}

// ----------------------
// Botones de feedback
// ----------------------
export async function handleFeedbackButtons(userId, option) {
  const soporte = process.env.SUPERVISOR_NUMBER || '573015972410';
  const lowerOpt = option.toLowerCase();

  const acciones = {
    'si, gracias': async () => cerrarChat(userId),
    'otra pregunta': async () => {
      await whatsappService.sendMessage(userId, '¡Perfecto! Puedes escribirme tu siguiente inquietud.');
      await setEstado(userId, 'ia', 'esperando_pregunta');
    },
    'hablar con soporte': async () => {
      await whatsappService.sendMessage(userId, 'Conectándote con nuestro equipo de soporte humano… Un momento por favor 👩‍💻');
      await whatsappService.sendMessage(soporte, `📞 El cliente ${userId} solicitó soporte humano.`);
      await deleteEstado(userId);
    }
  };

  if (acciones[lowerOpt]) {
    return acciones[lowerOpt]();
  }
}

// ----------------------
// Cerrar chat
// ----------------------
export async function cerrarChat(userId) {
  await clearUserTimers(userId);
  await whatsappService.sendMessage(
    userId,
    "✨ ¡Gracias por confiar en nosotros! Si vuelves a necesitar ayuda, solo escríbeme por este mismo chat 💬. ¡Que tengas un excelente día! 🙌"
  );
  await deleteEstado(userId);
}

// ----------------------
// Captura de quejas
// ----------------------
export async function capturarQuejaYRedirigir(userId, message, senderInfo) {
  const userState = await getEstado(userId);
  if (userState?.estado === 'quejas_reclamos' && userState?.subestado === 'esperando_detalle') {
    await escalarReclamo({ userId, mensaje: message, senderInfo });
  }
}

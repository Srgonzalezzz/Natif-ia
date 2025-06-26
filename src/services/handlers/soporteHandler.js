import whatsappService from '../whatsappService.js';
import stateStore from '../stateStore.js';

export async function redirigirASoporte(userId, mensaje, senderInfo) {
  const numeroSupervisor = '573006888304';
  const nombreCliente = senderInfo?.profile?.name || 'Cliente sin nombre';

  const plantilla = {
    name: 'reclamo_detectado',
    languageCode: 'es',
    parameters: [
      { type: 'text', text: nombreCliente },
      { type: 'text', text: mensaje },
      { type: 'text', text: userId }
    ]
  };

  try {
    await whatsappService.sendTemplateMessage(
      numeroSupervisor,
      plantilla.name,
      plantilla.languageCode,
      [{ type: 'body', parameters: plantilla.parameters }]
    );

    await whatsappService.sendMessage(
      numeroSupervisor,
      `📢 Reclamo recibido:\n\n👤 Cliente: *${nombreCliente}*\n📞 WhatsApp: ${userId}\n✉️ Reclamo: ${mensaje}`
    );

    await whatsappService.sendMessage(userId, "✅ Hemos recibido tu mensaje. Un asesor de NATIF se comunicará contigo muy pronto 🙏");
    await stateStore.delete(userId);
  } catch (error) {
    console.error("❌ Error notificando al asesor humano:", error.response?.data || error.message);
    await whatsappService.sendMessage(userId, "Hubo un error al contactar al equipo de soporte 😔. Intenta de nuevo más tarde.");
  }
}

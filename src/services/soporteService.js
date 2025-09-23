// src/services/soporteService.js
import whatsappService from '../services/whatsappService.js';
import { guardarReclamoEnSheet } from '../utils/googleOAuthLogger.js';
import { deleteEstado } from '../utils/stateManager.js';

const DEFAULT_SUPERVISOR = process.env.SUPERVISOR_NUMBER || '573015972410';

export async function escalarReclamo({ userId, mensaje, senderInfo, supervisor = DEFAULT_SUPERVISOR }) {
  const nombre = senderInfo?.profile?.name || senderInfo?.name || 'Cliente';
  try {
    const plantilla = {
      name: 'reclamo_detectado',
      languageCode: 'es',
      parameters: [
        { type: 'text', text: nombre },
        { type: 'text', text: mensaje },
        { type: 'text', text: userId }
      ]
    };

    await whatsappService.sendTemplateMessage(supervisor, plantilla.name, plantilla.languageCode, [{ type: 'body', parameters: plantilla.parameters }]);
    await whatsappService.sendMessage(supervisor, `📢 Reclamo recibido:\n\n👤 Cliente: *${nombre}*\n📞 WhatsApp: ${userId}\n✉️ Reclamo: ${mensaje}`);

    await whatsappService.sendMessage(userId, "✅ Hemos recibido tu mensaje. Un asesor de NATIF se comunicará contigo muy pronto 🙏");

    await guardarReclamoEnSheet({
      fecha: new Date().toISOString(),
      cliente: nombre,
      numero: userId,
      reclamo: mensaje,
      estado: 'Nuevo'
    });

    await deleteEstado(userId);
    return true;
  } catch (err) {
    console.error('soporteService.escalarReclamo error', err?.message || err);
    await whatsappService.sendMessage(userId, "Hubo un error al contactar al equipo de soporte 😔. Intenta de nuevo más tarde.");
    return false;
  }
}

// src/services/soporteHandler.js
import whatsappService from '../whatsappService.js';
import { guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';
import { deleteEstado } from '../../utils/stateManager.js';

const DEFAULT_SUPERVISOR = process.env.SUPERVISOR_NUMBER || '573015972410';

/**
 * Escala o redirige un reclamo al equipo de soporte humano
 * @param {Object} params
 * @param {string} params.userId - Número del cliente (WhatsApp ID).
 * @param {string} params.mensaje - Texto del reclamo.
 * @param {Object} params.senderInfo - Información del remitente (profile, nombre, etc.).
 * @param {string} [params.supervisor=DEFAULT_SUPERVISOR] - Número del supervisor (WhatsApp).
 * @param {boolean} [params.guardarEnSheet=true] - Si debe registrar el reclamo en Google Sheets.
 */
export async function escalarReclamo({
  userId,
  mensaje,
  senderInfo,
  supervisor = DEFAULT_SUPERVISOR,
  guardarEnSheet = true
}) {
  const nombreCliente = senderInfo?.profile?.name || senderInfo?.name || "Cliente";

  const plantilla = {
    name: "reclamo_detectado",
    languageCode: "es",
    parameters: [
      { type: "text", text: nombreCliente },
      { type: "text", text: mensaje },
      { type: "text", text: userId }
    ]
  };

  try {
    // Notificación al supervisor con plantilla
    await whatsappService.sendTemplateMessage(
      supervisor,
      plantilla.name,
      plantilla.languageCode,
      [{ type: "body", parameters: plantilla.parameters }]
    );

    // Mensaje adicional al supervisor
    await whatsappService.sendMessage(
      supervisor,
      `📢 Reclamo recibido:\n\n👤 Cliente: *${nombreCliente}*\n📞 WhatsApp: ${userId}\n✉️ Reclamo: ${mensaje}`
    );

    // Confirmación al cliente
    await whatsappService.sendMessage(
      userId,
      "✅ Hemos recibido tu mensaje. Un asesor de NATIF se comunicará contigo muy pronto 🙏"
    );

    // Guardar en Google Sheet si aplica
    if (guardarEnSheet) {
      await guardarReclamoEnSheet({
        fecha: new Date().toISOString(),
        cliente: nombreCliente,
        numero: userId,
        reclamo: mensaje,
        estado: "Nuevo"
      });
    }

    // Reset de estado del cliente
    await deleteEstado(userId);

    return true;
  } catch (error) {
    console.error("❌ Error en soporteHandler.manejarReclamo:", error?.response?.data || error.message);
    await whatsappService.sendMessage(
      userId,
      "Hubo un error al contactar al equipo de soporte 😔. Intenta de nuevo más tarde."
    );
    return false;
  }
}

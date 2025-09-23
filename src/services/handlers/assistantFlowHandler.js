// src/services/handlers/assistantFlowHandler.js
import { getEstado, setEstado, updateEstado, resetEstado } from '../../utils/stateManager.js';
import detectarIntencionPipeline from '../../utils/intentionService.js';
import { buscarEnPDFs } from '../pdfIndexer.js'; // opcional si lo necesitas directo
import { procesarConsultaLibre } from '../assistantOrchestrator.js';
import GeminiService from '../geminiService.js';
import { formatRespuestaFromSource } from '../../utils/responseFormatter.js';
import { registrarLog, guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';
import { ejecutarFlujoConversacional, encontrarFlujoPorIntencion } from './flujoHandler.js';
import { escalarReclamo } from '../soporteService.js';
import { sendWelcomeMenu, cerrarChat } from './menuHandler.js';
import whatsappService from '../whatsappService.js';
import { setInactivityTimers, clearUserTimers } from '../../services/timers.js';

export default async function handleAssistantFlow(userId, message, senderInfo) {
  try {
    const state = await getEstado(userId);
    clearUserTimers(userId);

    // 1) Si venimos en sub-flujo de factura, delegamos (mantener compatibilidad)
    if (state?.estado === 'factura') {
      // delega a handler existente
      const factura = await import('./facturaHandler.js');
      await factura.default(userId, message, state);
      return;
    }

    // 2) Clasificar intención (central)
    const intencion = await detectarIntencionPipeline(message, userId, state?.historial || []);

    // 3) Reclamo (salva a sheet y escala)
    if (intencion === 'reclamo') {
      const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
      const cliente = senderInfo?.nombre || senderInfo?.profile?.name || 'Sin nombre';
      const numero = senderInfo?.numero || userId;

      await guardarReclamoEnSheet({
        fecha,
        cliente,
        numero,
        reclamo: message
      });

      await escalarReclamo({ userId, mensaje: message, senderInfo });
      return;
    }

    // 4) Flujos predefinidos (estado / facturación)
    const flujo = encontrarFlujoPorIntencion(intencion);
    if (flujo?.intencion === 'factura') {
      await setEstado(userId, 'factura', 'factura_electronica');
      await whatsappService.sendMessage(userId, flujo.pregunta);
      return;
    }

    if (flujo) {
      await ejecutarFlujoConversacional(userId, flujo);
      return;
    }

    // 5) Consulta libre (RAG + Gemini)
    const respuestaSource = await procesarConsultaLibre(userId, message, intencion);
    const respuesta = formatRespuestaFromSource(respuestaSource, intencion) || (await GeminiService(userId, message));

    // 6) Enviar
    await whatsappService.sendMessage(userId, respuesta);

    // 7) Guardar historial y estado
    const actualizado = (await getEstado(userId)) || {};
    const historial = actualizado?.historial || [];
    historial.push({ tipo: 'bot', texto: respuesta, timestamp: new Date().toISOString() });
    await updateEstado(userId, { historial, ultimaActualizacion: Date.now() });

    // 8) Log
    await registrarLog({
      userId,
      pregunta: message,
      respuesta,
      fuente: respuestaSource?.origen || 'gemini',
      intencion: String(intencion)
    });

    // 9) Cierre si escribe "gracias"
    if (message.toLowerCase().includes('gracias')) {
      await cerrarChat(userId);
      return;
    }

    // 10) Volver a timers (inactividad)
    setInactivityTimers(userId);

  } catch (err) {
    console.error("assistantFlowHandler error:", err);
    await whatsappService.sendMessage(userId, "😓 Uy, algo salió mal procesando tu solicitud. Intenta nuevamente o escribe *menu* para volver al inicio.");
  }
}

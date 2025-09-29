// src/services/handlers/assistantFlowHandler.js
import { getEstado, setEstado, updateEstado } from '../../utils/stateManager.js';
import detectarIntencionPipeline from '../../utils/intentionService.js';
import { procesarConsultaLibre } from '../assistantOrchestrator.js';
import GeminiService from '../geminiService.js';
import { formatRespuestaFromSource } from '../../utils/responseFormatter.js';
import { registrarLog, guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';
import { ejecutarFlujoConversacional, encontrarFlujoPorIntencion } from './flujoHandler.js';
import { escalarReclamo } from '../handlers/soporteHandler.js';
import { cerrarChat } from './menuHandler.js';
import whatsappService from '../whatsappService.js';
import { setInactivityTimers, clearUserTimers } from '../../services/timers.js';

// 🔹 Helpers internos
async function guardarHistorial(userId, respuesta) {
  const state = (await getEstado(userId)) || {};
  const historial = state.historial || [];
  historial.push({ tipo: 'bot', texto: respuesta, timestamp: new Date().toISOString() });
  await updateEstado(userId, { historial, ultimaActualizacion: Date.now() });
}

async function manejarReclamo(userId, message, senderInfo) {
  const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
  const cliente = senderInfo?.nombre || senderInfo?.profile?.name || 'Sin nombre';
  const numero = senderInfo?.numero || userId;

  await guardarReclamoEnSheet({ fecha, cliente, numero, reclamo: message });
  await escalarReclamo({ userId, mensaje: message, senderInfo });
}

export default async function handleAssistantFlow(userId, message, senderInfo) {
  try {
    const state = await getEstado(userId);
    clearUserTimers(userId);

    // 1) Sub-flujo de factura
    if (state?.estado === 'factura') {
      const factura = await import('./facturaHandler.js');
      return factura.default(userId, message, state);
    }

    // 2) Clasificar intención
    const intencion = await detectarIntencionPipeline(message, userId, state?.historial || []);

    // 3) Reclamos
    if (intencion === 'reclamo') {
      await manejarReclamo(userId, message, senderInfo);
      return;
    }

    // 4) Flujos predefinidos
    const flujo = encontrarFlujoPorIntencion(intencion);
    if (flujo) {
      if (flujo.intencion === 'factura') {
        await setEstado(userId, 'factura', 'factura_electronica');
        await whatsappService.sendMessage(userId, flujo.pregunta);
      } else {
        await ejecutarFlujoConversacional(userId, flujo);
      }
      return;
    }

    // 5) Consulta libre (RAG + Gemini)
    const respuestaSource = await procesarConsultaLibre(userId, message, intencion);
    const respuesta =
      formatRespuestaFromSource(respuestaSource, intencion) ||
      (await GeminiService(userId, message));

    await whatsappService.sendMessage(userId, respuesta);

    // 6) Guardar historial y log
    await guardarHistorial(userId, respuesta);
    await registrarLog({
      userId,
      pregunta: message,
      respuesta,
      fuente: respuestaSource?.origen || 'gemini',
      intencion: String(intencion)
    });

    // 7) Cierre automático
    if (message.toLowerCase().includes('gracias')) {
      await cerrarChat(userId);
      return;
    }

    // 8) Reactivar timers
    setInactivityTimers(userId);

  } catch (err) {
    console.error("assistantFlowHandler error:", err);
    await whatsappService.sendMessage(
      userId,
      "😓 Uy, algo salió mal procesando tu solicitud. Intenta nuevamente o escribe *menu* para volver al inicio."
    );
  }
}

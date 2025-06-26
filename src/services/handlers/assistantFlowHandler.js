import stateStore from '../stateStore.js';
import detectarIntencion from '../../utils/intentionClassifier.js';
import buscarEnDocumentoLocal from '../localKnowledge.js';
import GeminiService from '../geminiService.js';
import { formatearRespuesta, formatearPorClave } from '../../utils/textFormatter.js';
import { registrarLog } from '../../utils/googleOAuthLogger.js';
import {
  ejecutarFlujoConversacional,
  encontrarFlujoPorIntencion
} from '../handlers/flujoHandler.js';
import { redirigirASoporte } from './soporteHandler.js';
import {
  sendWelcomeMessage,
  sendWelcomeMenu,
  cerrarChat
} from './menuHandler.js';
import whatsappService from '../whatsappService.js';
import factura from './facturaHandler.js';
import { guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';



export default async function handleAssistantFlow(userId, message, senderInfo) {
  try {
    const state = await stateStore.get(userId);
    clearTimeout(state?.timeout);

    if (state?.estado === 'factura') {
      await factura(userId, message, state);
      return;
    }

    const intencion = await detectarIntencion(message);

    if (intencion === 'reclamo') {
      const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
      const cliente = senderInfo?.nombre || 'Sin nombre';
      const numero = senderInfo?.numero || userId;

      await guardarReclamoEnSheet({
        fecha,
        cliente,
        numero,
        reclamo: message
      });

      await redirigirASoporte(userId, message, senderInfo);
      return;
    }


    const flujo = encontrarFlujoPorIntencion(intencion);
    if (flujo?.intencion === 'factura') {
      await stateStore.set(userId, {
        estado: 'factura',
        subestado: 'factura_electronica',
        ultimaActualizacion: Date.now()
      });
      await whatsappService.sendMessage(userId, flujo.pregunta);
      return;
    }

    if (flujo) {
      await ejecutarFlujoConversacional(userId, flujo);
      return;
    }

    const respuestaLocal = await buscarEnDocumentoLocal(message);
    const respuesta = respuestaLocal
      ? formatearPorClave(intencion, Array.isArray(respuestaLocal) ? respuestaLocal.map(x => x.texto).join('\n') : respuestaLocal)
      : formatearRespuesta(await GeminiService(userId, message));

    await whatsappService.sendMessage(userId, respuesta);

    const actualizado = await stateStore.get(userId);
    const historial = actualizado?.historial || [];
    historial.push({ tipo: 'bot', texto: respuesta, timestamp: new Date().toISOString() });

    await stateStore.set(userId, {
      ...actualizado,
      historial,
      ultimaActualizacion: Date.now()
    });

    await registrarLog({
      userId,
      pregunta: message,
      respuesta,
      fuente: respuestaLocal ? 'local' : 'gemini',
      intencion: typeof intencion === 'object' ? JSON.stringify(intencion) : String(intencion)
    });

    if (message.includes('gracias')) return await cerrarChat(userId);

    const { setInactivityTimers } = await import('./inactivityTimers.js');
    setInactivityTimers(userId);

  } catch (err) {
    console.error("Error en flujo IA:", err);
    await whatsappService.sendMessage(userId, "😓 Uy, algo salió mal procesando tu solicitud. Intenta nuevamente o escribe *menu* para volver al inicio.");
  }
}

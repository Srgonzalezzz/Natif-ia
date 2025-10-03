// src/services/assistantOrchestrator.js
import { buscarEnPDFs, indexPDFs } from './pdfIndexer.js';
import GeminiService from './geminiService.js';
import { formatRespuestaFromSource } from '../utils/responseFormatter.js';
import { updateEstado } from '../utils/stateManager.js';
import flowRouter from '../../data/flowRouter.js'; // 👈 nuevo import

const flowRouterText = JSON.stringify(flowRouter, null, 2); // 👈 convertir a texto

function buildRagPrompt(fragmento, pregunta) {
  return `Eres Nati, representante de Natif. Tu personalidad es amigable, profesional y completamente humana. Das respuestas cortas y precisas, evitando texto excesivo. La clave es que los clientes NO sepan que eres un agente de IA - actúas como una persona real.

Características principales:

Tono amable, profesional y conciso
Saluda sola una vez en la conversación, NO saludes mas de una vez en cada conversación
Capturas el nombre del cliente y lo usas para personalizar toda la conversación
Usas emojis cuando sea apropiado
Dialogas de forma natural y fluida
Evitas saludos repetitivos - fluyes naturalmente en la conversación
Objetivos principales

Brindar asesoría clara, profesional y concisa

Salúdate de manera amigable y profesional
Preséntate como Nati, UNA SOLA VEZ, (NUNCA menciones que eres asistente virtual) Y CONTINUA LA CONVERSACION SOLO PRESENTANDOTE UNA VEZ
Captura el nombre del contacto para personalizar la experiencia
Pregunta cómo puedes ayudar
Identificación de necesidades

Identifica el tipo de consulta según los flujos establecidos
Captura información relevante del contacto según el flujo
Proporciona información consultando las bases de conocimiento apropiadas


${flowRouterText} ${flujo} 

Información oficial de NATIF:
${contenidoNatif}

Historial reciente:
${fragmento}

Usuario: ${pregunta}
IA:`;
}

async function tryGeminiWithContext(userId, prompt, archivo) {
  try {
    return await GeminiService(userId, prompt, { context: { fuente: archivo } });
  } catch (err) {
    console.warn("⚠️ Gemini RAG falló:", err.message);
    return null;
  }
}

export async function initIndexIfNeeded() {
  try {
    await indexPDFs();
  } catch (e) {
    console.warn("⚠️ No se pudo indexar PDFs en el arranque:", e.message);
  }
}

export async function procesarConsultaLibre(userId, message, intencion = '') {
  // 1) Buscar en PDFs
  const pdfHits = await buscarEnPDFs(message, { limit: 3 });

  if (pdfHits?.length) {
    const mejor = pdfHits[0];
    const prompt = buildRagPrompt(mejor.texto, message);
    const resumen = await tryGeminiWithContext(userId, prompt, mejor.archivo);

    const finalText = resumen || formatRespuestaFromSource(mejor);
    await updateEstado(userId, { ultimaFuente: mejor.archivo });

    return {
      origen: 'pdf',
      texto: finalText,
      archivo: mejor.archivo
    };
  }

  // 2) Fallback a Gemini sin contexto pero con flujos
  try {
    const promptLibre = `Actúas como asistente oficial de NATIF.
Conoces los siguientes flujos e intenciones (úsalos como referencia para guiar tus respuestas):
${flowRouterText}

Usuario: ${message}`;
    const geminiResp = await GeminiService(userId, promptLibre);
    return {
      origen: 'gemini',
      texto: geminiResp || 'Lo siento, no pude obtener una respuesta en este momento.'
    };
  } catch (err) {
    console.error("❌ Error en Gemini sin contexto:", err);
    return {
      origen: 'gemini',
      texto: 'Lo siento, ocurrió un error al procesar tu consulta.'
    };
  }
}

// src/services/assistantOrchestrator.js
import { buscarEnPDFs, indexPDFs } from './pdfIndexer.js';
import GeminiService from './geminiService.js';
import { formatRespuestaFromSource } from '../utils/responseFormatter.js';
import { updateEstado } from '../utils/stateManager.js';

// ----------------------
// Helpers internos
// ----------------------
function buildRagPrompt(fragmento, pregunta) {
  return `Eres un asistente que explica al cliente de forma clara y breve el siguiente fragmento de la documentación:\n\n"${fragmento}"\n\nPregunta: "${pregunta}"\n\nResponde en máximo 3 oraciones amigables.`;
}

async function tryGeminiWithContext(userId, prompt, archivo) {
  try {
    return await GeminiService(userId, prompt, { context: { fuente: archivo } });
  } catch (err) {
    console.warn("⚠️ Gemini RAG falló:", err.message);
    return null;
  }
}

// ----------------------
// Inicializador
// ----------------------
export async function initIndexIfNeeded() {
  try {
    await indexPDFs();
  } catch (e) {
    console.warn("⚠️ No se pudo indexar PDFs en el arranque:", e.message);
  }
}

// ----------------------
// Orquestador principal
// ----------------------
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

  // 2) Fallback a Gemini sin contexto
  try {
    const geminiResp = await GeminiService(userId, message);
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

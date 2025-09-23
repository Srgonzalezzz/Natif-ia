// src/services/assistantOrchestrator.js
import { buscarEnPDFs, indexPDFs } from './pdfIndexer.js';
import GeminiService from './geminiService.js';
import { formatRespuestaFromSource } from '../utils/responseFormatter.js';
import { updateEstado } from '../utils/stateManager.js';

export async function initIndexIfNeeded() {
  // indexa en arranque si quieres
  try { await indexPDFs(); } catch (e) { /* ignore */ }
}

export async function procesarConsultaLibre(userId, message, intencion = '') {
  // 1) buscar en PDFs
  const pdfHits = await buscarEnPDFs(message, { limit: 3 });

  if (pdfHits && pdfHits.length) {
    const mejor = pdfHits[0];
    // Intenta pedir a Gemini que explique brevemente (RAG)
    const prompt = `Eres un asistente que explica al cliente de forma clara y breve el siguiente fragmento de la documentación:\n\n"${mejor.texto}"\n\nPregunta: "${message}"\n\nResponde en máximo 3 oraciones amigables.`;
    let resumo = null;
    try {
      resumo = await GeminiService(userId, prompt, { context: { fuente: mejor.archivo }});
    } catch (err) {
      resumo = null;
    }
    const finalText = resumo || formatRespuestaFromSource(mejor);
    // actualizar estado (ej: guardar fuente consultada)
    await updateEstado(userId, { ultimaFuente: mejor.archivo });
    return { origen: 'pdf', texto: finalText, archivo: mejor.archivo };
  }

  // 2) fallback a Gemini sin contexto
  const geminiResp = await GeminiService(userId, message);
  return { origen: 'gemini', texto: geminiResp || 'Lo siento, no pude obtener una respuesta en este momento.' };
}

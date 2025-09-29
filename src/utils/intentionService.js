// src/utils/intentionService.js
import flowRouter from '../../data/flowRouter.js';
import GeminiService from '../services/geminiService.js';

function heuristics(message) {
  if (/gu[ií]a|rastreo|seguim/i.test(message)) return 'estado_pedido';
  if (/factura|nit|ruc|cedula|comprobante/i.test(message)) return 'factura';
  if (/reclam|quej|dañad|equivocado|incompleto|falt/i.test(message)) return 'reclamo';
  if (/soporte|asesor|humano|ayuda/i.test(message)) return 'soporte';
  return null;
}

export default async function detectarIntencionPipeline(message, userId, historial = []) {
  const msg = String(message).toLowerCase();

  // 1. Keywords estáticos
  for (const f of Object.values(flowRouter || {})) {
    if (f.keywords?.some(k => msg.includes(k.toLowerCase()))) {
      return f.intencion;
    }
  }

  // 2. Heurísticos
  const h = heuristics(msg);
  if (h) return h;

  // 3. Fallback con Gemini
  const prompt = `Clasifica este mensaje en una etiqueta: estado_pedido, factura, reclamo, soporte, pregunta_frecuente, otro.
Mensaje: "${message}"
Devuelve solo la etiqueta.`;

  try {
    const resp = await GeminiService(userId, prompt, { system: 'classify' });
    return (resp || 'otro').trim().toLowerCase();
  } catch (err) {
    console.warn('⚠️ Error clasificando intención:', err.message);
    return 'otro';
  }
}

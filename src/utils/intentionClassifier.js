// src/utils/intentionService.js
import flowRouter from '../../data/flowRouter.js';
import GeminiService from '../services/geminiService.js';

function heuristics(message) {
  if (/gu[ií]a|rastreo|rastreo|seguim/i.test(message)) return 'estado_pedido';
  if (/factura|nit|ruc|cedula/i.test(message)) return 'factura';
  if (/reclam|quej|dañad|equivocado/i.test(message)) return 'reclamo';
  return null;
}

export default async function detectarIntencionPipeline(message, userId, historial = []) {
  const msg = String(message).toLowerCase();

  // 1) Reglas de flowRouter (si tienen keywords)
  for (const f of Object.values(flowRouter || {})) {
    if (f.keywords) {
      for (const k of f.keywords) {
        if (msg.includes(k.toLowerCase())) return f.intencion;
      }
    }
  }

  // 2) Heurísticos simples
  const h = heuristics(msg);
  if (h) return h;

  // 3) Fallback: pedir a Gemini
  const prompt = `Clasifica la intención del siguiente mensaje en una de: estado_pedido, factura, reclamo, soporte, pregunta_frecuente, otro.
Mensaje: "${message}".
Devuelve sólo la etiqueta.`;
  try {
    const resp = await GeminiService(userId, prompt, { system: 'classify' });
    return (resp || 'otro').trim();
  } catch (err) {
    console.warn('Gemini classifier error', err.message);
    return 'otro';
  }
}

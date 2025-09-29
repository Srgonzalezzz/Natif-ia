import flowRouter from '../../data/flowRouter.js';
import GeminiService from '../services/geminiService.js';

function aplicarHeuristicas(message) {
  const texto = message.toLowerCase();

  if (/gu[ií]a|rastreo|tracking|seguim/i.test(texto)) return 'estado_pedido';
  if (/factura|nit|ruc|c[eé]dula|comprobante/i.test(texto)) return 'factura';
  if (/reclam|quej|dañad|equivocad|incompleto|falt/i.test(texto)) return 'reclamo';
  if (/soporte|asesor|humano|ayuda/i.test(texto)) return 'soporte';
  if (/pregunta|frecuente|info|informaci/i.test(texto)) return 'pregunta_frecuente';

  return null;
}

function buscarEnFlujos(message) {
  const texto = message.toLowerCase();
  for (const flujo of Object.values(flowRouter)) {
    if (flujo.keywords?.some(k => texto.includes(k.toLowerCase()))) {
      return flujo.intencion;
    }
  }
  return null;
}

export default async function detectarIntencionPipeline(message, userId, historial = []) {
  const texto = String(message).toLowerCase();

  // Paso 1: Buscar en flujos estáticos
  const matchFlujo = buscarEnFlujos(texto);
  if (matchFlujo) return matchFlujo;

  // Paso 2: Aplicar heurísticas personalizadas
  const heuristica = aplicarHeuristicas(texto);
  if (heuristica) return heuristica;

  // Paso 3: Fallback con Gemini
  const prompt = `Clasifica el siguiente mensaje en una de estas etiquetas:\n\n- estado_pedido\n- factura\n- reclamo\n- soporte\n- pregunta_frecuente\n- otro\n\nMensaje:\n"${message}"\n\nDevuelve SOLO una de las etiquetas.`;
  try {
    const respuesta = await GeminiService(userId, prompt, { system: 'classify' });
    return (respuesta || 'otro').toLowerCase().trim();
  } catch (error) {
    console.warn('⚠️ Error clasificando intención con Gemini:', error.message);
    return 'otro';
  }
}

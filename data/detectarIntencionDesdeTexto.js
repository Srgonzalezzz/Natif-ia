import flujos from '../data/flows.js';

export default function detectarIntencionDesdeTexto(texto) {
  const msg = texto.toLowerCase();

  for (const key in flujos) {
    const flujo = flujos[key];
    for (const palabra of flujo.keywords || []) {
      if (msg.includes(palabra.toLowerCase())) {
        return flujo;
      }
    }
  }

  return null;
}

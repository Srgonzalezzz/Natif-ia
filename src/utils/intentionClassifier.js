import flujos from '../../data/flows.js';

export default function detectarIntencion(texto) {
  texto = texto.toLowerCase();

  for (const flujo of Object.values(flujos)) {
    if (flujo.keywords?.some(kw => texto.includes(kw.toLowerCase()))) {
      return flujo.intencion;
    }
  }

  return 'desconocido';
}



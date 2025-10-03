import Fuse from 'fuse.js';
import flujos from '../../data/flowRouter.js';

// Preparamos un array con todos los keywords de cada flujo
const flujosArray = Object.values(flujos).map(f => ({
  ...f,
  keywordsText: (f.keywords || []).join(' ')
}));

const fuse = new Fuse(flujosArray, {
  keys: ['keywordsText'],
  includeScore: true,
  threshold: 0.4, // sensibilidad: más bajo = más estricto, más alto = más flexible
  ignoreLocation: true,
  minMatchCharLength: 3
});

export function buscarFlujoPorKeywords(mensaje) {
  const result = fuse.search(mensaje);
  if (!result.length) return null;
  // El primero es el mejor match
  return result[0].item; // devuelve el flujo completo
}

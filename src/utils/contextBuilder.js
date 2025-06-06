import stateStore from '../services/stateStore.js';

export async function obtenerHistorialReducido(userId, maxInteracciones = 3) {
  const state = await stateStore.get(userId);
  const historial = (state?.historial || []).slice(-maxInteracciones * 2);

  return historial.map(item =>
    item.tipo === 'usuario' ? `Usuario: ${item.texto}` : `Asistente: ${item.texto}`
  ).join('\n');
}

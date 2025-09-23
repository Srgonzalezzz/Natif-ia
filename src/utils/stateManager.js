// src/utils/stateManager.js
import stateStore from '../services/stateStore.js';

export async function setEstado(userId, estado, subestado, extras = {}) {
  const base = { estado, subestado, ultimaActualizacion: Date.now(), ...extras };
  await stateStore.set(userId, base);
  return base;
}

export async function resetEstado(userId) {
  const base = { estado: 'inicio', subestado: 'menu_principal', historial: [], ultimaActualizacion: Date.now() };
  await stateStore.set(userId, base);
  return base;
}

export async function updateEstado(userId, patch = {}) {
  const current = (await stateStore.get(userId)) || {};
  const updated = { ...current, ...patch, ultimaActualizacion: Date.now() };
  await stateStore.set(userId, updated);
  return updated;
}

export async function getEstado(userId) {
  return await stateStore.get(userId);
}

export async function deleteEstado(userId) {
  return await stateStore.delete(userId);
}

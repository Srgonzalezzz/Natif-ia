// src/services/conversationalMemory.js

const memoryStore = new Map();
const MAX_HISTORY = 10; // configurable: número máximo de interacciones

export function getConversation(userId) {
  return memoryStore.get(userId) || [];
}

export function addToConversation(userId, userMessage, aiResponse) {
  if (!userMessage && !aiResponse) return; // evita guardar vacío

  const history = memoryStore.get(userId) || [];
  const timestamp = new Date().toISOString();

  if (userMessage) {
    history.push({ role: 'user', content: userMessage, timestamp });
  }
  if (aiResponse) {
    history.push({ role: 'assistant', content: aiResponse, timestamp });
  }

  // Limitar historial
  memoryStore.set(userId, history.slice(-MAX_HISTORY));
}

export function clearConversation(userId) {
  memoryStore.delete(userId);
}

export function hasConversation(userId) {
  return memoryStore.has(userId);
}

export function getConversationSize(userId) {
  return (memoryStore.get(userId) || []).length;
}

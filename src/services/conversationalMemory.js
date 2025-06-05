// src/services/conversationalMemory.js

const memoryStore = new Map();

export function getConversation(userId) {
    return memoryStore.get(userId) || [];
}

export function addToConversation(userId, userMessage, aiResponse) {
    const history = memoryStore.get(userId) || [];
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: aiResponse });
    memoryStore.set(userId, history.slice(-10));
}

export function clearConversation(userId) {
    memoryStore.delete(userId);
}
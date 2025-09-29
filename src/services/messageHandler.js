// src/services/MessageHandler.js
import whatsappService from './whatsappService.js';
import handleTextMessage from './handlers/handleTextMessage.js';
import handleInteractiveMessage from './handlers/handleInteractiveMessage.js';
import handleMediaMessage from './handlers/handleMediaMessage.js';
import { setInactivityTimers, clearUserTimers } from './timers.js';

class MessageHandler {
  async handleIncomingMessage(message, senderInfo) {
    if (!message) return;

    const userId = message.from;

    try {
      // 👉 Procesar mensaje según tipo
      if (message.type === 'text' && message.text?.body) {
        await handleTextMessage(message.text.body, userId, senderInfo);
      } else if (message.type === 'interactive') {
        await handleInteractiveMessage(message, senderInfo);
      } else if (["image", "video", "audio", "document"].includes(message.type)) {
        await handleMediaMessage(message, userId, senderInfo);
      } else {
        console.warn(`⚠️ Tipo de mensaje no soportado: ${message.type}`);
      }

      // ✅ Marcar como leído
      await whatsappService.markAsRead(message.id);

      // ✅ Reiniciar timers en cualquier contexto
      clearUserTimers(userId);
      setInactivityTimers(userId);

    } catch (error) {
      console.error("❌ Error al manejar mensaje entrante:", error);
    }
  }
}

export default new MessageHandler();

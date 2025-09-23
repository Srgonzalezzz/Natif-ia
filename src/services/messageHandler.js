import whatsappService from './whatsappService.js';
import stateStore from './stateStore.js';
import handleMediaMessage from '../services/handlers/handleMediaMessage.js';
import handleTextMessage from '../services/handlers/handleTextMessage.js';
import handleInteractiveMessage from '../services/handlers/handleInteractiveMessage.js';
import { clearUserTimers } from '../services/handlers/inactivityTimers.js';

class MessageHandler {
  async handleIncomingMessage(message, senderInfo) {
    if (!message) return;

    try {
      const userId = message.from;

      if (message.type === 'text' && message.text?.body) {
        await handleTextMessage(message.text.body, userId, senderInfo);

      } else if (message.type === 'interactive') {
        // 👉 Aquí se manejan los botones y listas
        await handleInteractiveMessage(message, senderInfo);

      } else if (["image", "video", "audio", "document"].includes(message.type)) {
        // 👉 Aquí solo media (fotos, videos, audios, documentos)
        await handleMediaMessage(message, userId, senderInfo);
      }

      await whatsappService.markAsRead(message.id);
    } catch (error) {
      console.error("Error al manejar mensaje entrante:", error);
    }
  }

  async cerrarChat(userId) {
    await clearUserTimers(userId);
    await whatsappService.sendMessage(
      userId,
      "✨ ¡Gracias por confiar en nosotros! Si vuelves a necesitar ayuda, solo escríbeme por este mismo chat 💬. ¡Que tengas un excelente día! 🙌"
    );
    await stateStore.delete(userId);
  }
}

export default new MessageHandler();

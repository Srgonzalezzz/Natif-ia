import axios from 'axios';
import config from '../config/env.js';

class WhatsAppService {
  // Utilidad para dividir texto en fragmentos de hasta 4096 caracteres
  splitTextByLength(text, maxLength = 4096) {
    const parts = [];
    let index = 0;
    while (index < text.length) {
      parts.push(text.substring(index, index + maxLength));
      index += maxLength;
    }
    return parts;
  }

  async sendMessage(to, body, messageId) {
    try {
      if (body.length > 4096) {
        console.warn('⚠️ El texto excede los 4096 caracteres. Dividiendo...');
        const parts = this.splitTextByLength(body);
        for (const part of parts) {
          await this.sendMessage(to, part); // llamada recursiva para cada fragmento
        }
        return;
      }

      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          text: { body },
          // context: messageId ? { message_id: messageId } : undefined,
        },
      });
    } catch (error) {
      console.error('Error sending message:', error?.response?.data || error.message);
    }
  }

  async markAsRead(messageId) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
        },
        data: {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
      });
    } catch (error) {
      console.error('Error marking message as read:', error?.response?.data || error.message);
    }
  }

  async sendInteractiveButtons(to, BodyText, buttons) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: BodyText },
            action: { buttons },
          }
        },
      });
    } catch (error) {
      console.error('Error sending interactive buttons:', error?.response?.data || error.message);
    }
  }

  async sendTemplateMessage(to, templateName, languageCode, components) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components,
          },
        },
      });
    } catch (error) {
      console.error('❌ Error al enviar plantilla:', error?.response?.data || error.message);
    }
  }

  async sendListMessage(to, { header, body, footer, buttonText, sections }) {
    try {
      await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: "whatsapp",
          to,
          type: "interactive",
          interactive: {
            type: "list",
            header: { type: "text", text: header },
            body: { text: body },
            footer: { text: footer },
            action: {
              button: buttonText,
              sections
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Error al enviar lista:', error?.response?.data || error.message);
    }
  }

}

export default new WhatsAppService();

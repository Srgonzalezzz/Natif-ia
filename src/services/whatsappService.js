// src/services/whatsappService.js
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
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        console.warn(`❗ El mensaje está vacío o mal formado. Se canceló el envío a ${to}`);
        return;
      }

      if (body.length > 4096) {
        console.warn('⚠️ El texto excede los 4096 caracteres. Dividiendo...');
        const parts = this.splitTextByLength(body);
        for (const part of parts) {
          await this.sendMessage(to, part);
        }
        return;
      }

      const response = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/${config.API_VERSION}/${config.BUSINESS_PHONE}/messages`,
        headers: {
          Authorization: `Bearer ${config.API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
          ...(messageId && { context: { message_id: messageId } })
        },
      });

      console.log(`✅ Mensaje enviado a ${to}. Respuesta Meta:`, response.data);
    } catch (error) {
      // 🔥 Aquí imprimimos status y data del error completo
      if (error?.response) {
        console.error('❌ Error al enviar mensaje:',
          'status:', error.response.status,
          'data:', JSON.stringify(error.response.data, null, 2)
        );
      } else {
        console.error('❌ Error al enviar mensaje:', error.message);
      }
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
      if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > 3) {
        throw new Error(`❌ Número de botones inválido: ${buttons.length}. WhatsApp permite entre 1 y 3.`);
      }

      const res = await axios({
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
      console.log('✅ Botones enviados:', res.data);
    } catch (error) {
      console.error('❌ Error al enviar botones interactivos:', error?.response?.data || error.message);
    }
  }

  async sendTemplateMessage(to, templateName, languageCode, components) {
    try {
      const res = await axios({
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
      console.log('✅ Plantilla enviada:', res.data);
    } catch (error) {
      console.error('❌ Error al enviar plantilla:', error?.response?.data || error.message);
    }
  }

  async sendListMessage(to, { header, body, footer, buttonText, sections }) {
    try {
      const res = await axios({
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
      console.log('✅ Lista enviada:', res.data);
    } catch (error) {
      console.error('❌ Error al enviar lista:', error?.response?.data || error.message);
    }
  }
}

export default new WhatsAppService();

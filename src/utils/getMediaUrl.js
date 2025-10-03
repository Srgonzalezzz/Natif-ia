import fetch from 'node-fetch';

const WHATSAPP_TOKEN = process.env.API_TOKEN; // pon aquí tu token de WABA

/**
 * Obtiene la URL absoluta de descarga de un media de WhatsApp a partir de su ID.
 * @param {string} mediaId - id del media que llega en el webhook
 * @returns {Promise<{url:string, mime_type:string}>}
 */
export async function getMediaUrl(mediaId) {
  const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`
    }
  });
  if (!res.ok) throw new Error(`Error obteniendo media info: ${res.statusText}`);
  return res.json(); // devuelve objeto con url y mime_type
}

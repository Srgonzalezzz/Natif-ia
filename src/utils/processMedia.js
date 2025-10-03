// src/utils/processMedia.js
import { getMediaUrl } from './getMediaUrl.js';
import { uploadToDriveFromUrl } from './googleDriveUploader.js';

/**
 * Procesa un mensaje multimedia (image/video) y lo sube a Drive.
 * @param {Object} message - mensaje de WhatsApp
 * @returns {Promise<{tipo:string, evidenciaUrl:string}>}
 */
export async function procesarMedia(message) {
  const tipoMensaje = message.type;

  if (tipoMensaje === 'image' || tipoMensaje === 'video') {
    const mediaId = message[tipoMensaje]?.id;
    const { url: mediaUrl, mime_type: mimeType } = await getMediaUrl(mediaId);
    const ext = tipoMensaje === 'video' ? 'mp4' : 'jpg';
    const fileName = `Reclamo_${Date.now()}.${ext}`;
    const driveLink = await uploadToDriveFromUrl(mediaUrl, fileName, mimeType);
    return { tipo: tipoMensaje === 'video' ? 'Video' : 'Imagen', evidenciaUrl: driveLink };
  }

  return { tipo: 'Texto', evidenciaUrl: '' };
}

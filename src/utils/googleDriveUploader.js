// src/utils/googleDriveUploader.js
import fs from 'fs';
import os from 'os';
import path from 'path';
import fetch from 'node-fetch';
import { google } from 'googleapis';
import { authorize } from './googleOAuthLogger.js';

const WHATSAPP_TOKEN = process.env.API_TOKEN || process.env.WHATSAPP_TOKEN;

export async function uploadToDriveFromUrl(fileUrl, fileName, mimeType) {
  // Carpeta temporal correcta según SO
  const tmpDir = os.tmpdir(); // esto devuelve algo como C:\Users\TuUsuario\AppData\Local\Temp
  const filePath = path.join(tmpDir, fileName);

  // Descargar el archivo temporalmente con autorización
  const res = await fetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`
    }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error al descargar archivo: ${res.statusText} - ${body}`);
  }

  const buffer = await res.buffer();
  await fs.promises.writeFile(filePath, buffer); // usa filePath

  // Subir a Drive
  const auth = await authorize();
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = { name: fileName };
  const media = {
    mimeType,
    body: fs.createReadStream(filePath)
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id'
  });

  // Hacerlo público
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  // Obtener link público
  const result = await drive.files.get({
    fileId: file.data.id,
    fields: 'webViewLink'
  });

  // Borrar archivo temporal
  await fs.promises.unlink(filePath);

  return result.data.webViewLink; // Link permanente en Drive
}

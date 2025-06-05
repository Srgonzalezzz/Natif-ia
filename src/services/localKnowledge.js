import fs from 'fs/promises';
import path from 'path';
import Fuse from 'fuse.js';

const filePath = path.resolve('./data/natifInfo.json');

async function buscarEnDocumentoLocal(mensajeUsuario) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const conocimiento = JSON.parse(data);

    const fuse = new Fuse(conocimiento, {
      keys: ['clave', 'contenido'],
      threshold: 0.4,
    });

    const resultado = fuse.search(mensajeUsuario);

    if (resultado.length > 0) {
      return resultado[0].item.contenido;
    }

    return null;
  } catch (err) {
    console.error("❌ Error leyendo datos locales:", err.message);
    return null;
  }
  
}


export default buscarEnDocumentoLocal;


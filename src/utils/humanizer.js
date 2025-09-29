// src/utils/humanizer.js
import GeminiService from '../services/geminiService.js';

/**
 * Humaniza un mensaje predeterminado con IA.
 * @param {string} template - Mensaje base con {{variables}}
 * @param {object} variables - Objeto de variables {nombre: 'Ana'}
 * @returns {Promise<string>} - Mensaje reescrito de forma cercana y amable
 */
export async function humanizeMessage(template, variables = {}, userId = '') {
  // reemplaza variables {{nombre}}
  let filled = template.replace(/{{(\w+)}}/g, (_, v) => variables[v] || '');

  const prompt = `Reescribe este mensaje para que suene cercano, amable y conversacional:
"${filled}"`;

  try {
    return await GeminiService(userId, prompt, { system: 'rephrase' });
  } catch (err) {
    console.error('Error humanizando mensaje:', err);
    return filled; // fallback sin IA
  }
}

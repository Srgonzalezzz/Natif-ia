// src/services/geminiService.js
import fetch from 'node-fetch';
import fs from 'fs';
import { getConversation, addToConversation } from './conversationalMemory.js';
import { formatearRespuesta, formatearPorClave } from '../utils/textFormatter.js';

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const infoArray = JSON.parse(fs.readFileSync('./data/natifInfo.json', 'utf8'));
const contenidoNatif = infoArray
  .map(i => formatearPorClave(i.clave, i.contenido))
  .join('\n\n')
  .slice(0, 3000);

export default async function GeminiService(userId, prompt) {
  const history = getConversation(userId);

  const mensajeSanitizado = sanitizarTexto(prompt);

  const historialFormateado = history
    .slice(-10) // máximo 10 mensajes previos
    .map(m => `${m.role === 'user' ? 'Usuario' : 'IA'}: ${sanitizarTexto(m.content)}`)
    .join('\n');

  function sanitizarTexto(texto) {
    return texto
      .replace(/[<>]/g, '')     // eliminar signos que puedan alterar el prompt
      .replace(/\s{2,}/g, ' ')  // colapsar espacios múltiples
      .trim()
      .slice(0, 500);           // limitar a 500 caracteres por entrada
  }

  const fullPrompt = `Actúas como asistente oficial de NATIF. Tu respuesta debe ser clara, útil y basada solo en la información que se te proporcione. No inventes si no tienes datos. Si no tienes respuesta, di claramente 'No tengo suficiente información para responder. Aquí tienes información del sitio oficial:\n${contenidoNatif}\n\n${historialFormateado}\nUsuario: ${mensajeSanitizado}\nIA: y tu respuesta debe ser una sola y trata de evitar tanto texto`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No se obtuvo respuesta.';
    const replyFormateado = formatearRespuesta(reply);

    addToConversation(userId, prompt, replyFormateado);
    return replyFormateado;
  } catch (err) {
    console.error('❌ Error al consultar Gemini:', err.message);
    return 'Hubo un error consultando la IA de Google.';
  }
}

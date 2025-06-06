// src/services/geminiService.js
import fetch from 'node-fetch';
import fs from 'fs';
import { formatearRespuesta, formatearPorClave } from '../utils/textFormatter.js';
import { obtenerHistorialReducido } from '../utils/contextBuilder.js';

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const infoArray = JSON.parse(fs.readFileSync('./data/natifInfo.json', 'utf8'));
const contenidoNatif = infoArray
  .map(i => formatearPorClave(i.clave, i.contenido))
  .join('\n\n')
  .slice(0, 3000);

export default async function GeminiService(userId, prompt) {
  const mensajeSanitizado = sanitizarTexto(prompt);
  const historialFormateado = await obtenerHistorialReducido(userId);

  function sanitizarTexto(texto) {
    return texto
      .replace(/[<>]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 500);
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

    return replyFormateado;
  } catch (err) {
    console.error('❌ Error al consultar Gemini:', err.message);
    return 'Hubo un error consultando la IA de Google.';
  }
}

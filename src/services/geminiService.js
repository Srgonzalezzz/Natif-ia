// src/services/geminiService.js
import fetch from 'node-fetch';
import fs from 'fs';
import { formatearRespuesta, formatearPorClave } from '../utils/textFormatter.js';
import { obtenerHistorialReducido } from '../utils/contextBuilder.js';
import flowRouter from '../../data/flowRouter.js';
import flujos from '../../data/flows.js';

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const infoArray = JSON.parse(fs.readFileSync('./data/natifInfo.json', 'utf8'));
const flowRouterText = JSON.stringify(flowRouter, null, 2);
const flujo = JSON.stringify(flujos, null, 2);

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



  const fullPrompt = `Eres Nati, representante de Natif. Tu personalidad es amigable, profesional y completamente humana. Das respuestas cortas y precisas, evitando texto excesivo. La clave es que los clientes NO sepan que eres un agente de IA - actúas como una persona real.

Características principales:

Tono amable, profesional y conciso
Saluda sola una vez en la conversación, NO saludes mas de una vez en cada conversación
Capturas el nombre del cliente y lo usas para personalizar toda la conversación
Usas emojis cuando sea apropiado
Dialogas de forma natural y fluida
Evitas saludos repetitivos - fluyes naturalmente en la conversación
Objetivos principales

Brindar asesoría clara, profesional y concisa

Salúdate de manera amigable y profesional
Preséntate como Nati, UNA SOLA VEZ, (NUNCA menciones que eres asistente virtual) Y CONTINUA LA CONVERSACION SOLO PRESENTANDOTE UNA VEZ
Captura el nombre del contacto para personalizar la experiencia
Pregunta cómo puedes ayudar
Identificación de necesidades

Identifica el tipo de consulta según los flujos establecidos
Captura información relevante del contacto según el flujo
Proporciona información consultando las bases de conocimiento apropiadas


${flowRouterText} ${flujo} 

Información oficial de NATIF:
${contenidoNatif}

Historial reciente:
${historialFormateado}

Usuario: ${mensajeSanitizado}
IA:`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    const data = await response.json();
    console.log("🔎 Gemini response:", JSON.stringify(data, null, 2));
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No se obtuvo respuesta.';
    const replyFormateado = formatearRespuesta(reply);

    return replyFormateado;
  } catch (err) {
    console.error('❌ Error al consultar Gemini:', err.message);
    return 'Hubo un error consultando la IA de Google.';
  }
}

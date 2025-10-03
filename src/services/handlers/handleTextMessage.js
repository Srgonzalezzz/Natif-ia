// src/services/handlers/handleTextMessage.js
import { greetings, closingExpressions } from '../constants.js';
import { getEstado, setEstado, resetEstado, updateEstado } from '../../utils/stateManager.js';
import detectarIntencionPipeline from '../../utils/intentionService.js';
import {
  ejecutarFlujoConversacional,
  resolverFlujo,
  encontrarFlujoPorIntencion
} from './flujoHandler.js';

import handleAssistantFlow from './assistantFlowHandler.js';
import { handleTrackingQuery } from './trackingHandler.js';
import factura from './facturaHandler.js';
import {
  sendWelcomeMenu,
  sendWelcomeMessage,
  capturarQuejaYRedirigir
} from './menuHandler.js';

import whatsappService from '../whatsappService.js';
import { buscarPedido } from '../shopifyService.js';

// 👇 Importamos SOLO la versión inteligente de keywords con Fuse.js
import { buscarFlujoPorKeywords } from '../../utils/flujoMatcher.js';

export default async function handleTextMessage(text, userId, senderInfo) {
  const incomingMessage = String(text).toLowerCase().trim();

  // 1. Cierre de conversación
  if (closingExpressions.some(exp => incomingMessage.includes(exp))) {
    const { cerrarChat } = await import('./menuHandler.js');
    return await cerrarChat(userId);
  }

  // 2. Saludos
  if (greetings.some(greet => incomingMessage.includes(greet))) {
    await sendWelcomeMessage(userId, senderInfo);
    await sendWelcomeMenu(userId);
    await setEstado(userId, 'inicio', 'menu_principal', { mostroMenu: true });
    return;
  }

  // 3. Intentos rápidos (flujo directo por texto)
  const flujoDetectado = (await import('../../../data/detectarIntencionDesdeTexto.js')).default(incomingMessage);
  if (flujoDetectado) {
    await ejecutarFlujoConversacional(userId, flujoDetectado);
    return;
  }

  // 4. Verificar estado
  let estado = await getEstado(userId);
  if (!estado) {
    estado = await resetEstado(userId);
  }

  await capturarQuejaYRedirigir(userId, incomingMessage, senderInfo);

  const historial = estado?.historial || [];
  historial.push({ tipo: 'usuario', texto: incomingMessage, timestamp: new Date().toISOString() });
  await (await import('../stateStore.js')).default.set(userId, { ...estado, historial, ultimaActualizacion: Date.now() });

  // 5. Rutas por estado
  switch (estado.estado) {
    case 'seguimiento':
      if (estado.subestado === 'esperando_guia') {
        const pedido = await buscarPedido(incomingMessage);
        if (pedido) {
          const productos = pedido.productos?.join(', ') || 'N/A';
          await whatsappService.sendMessage(
            userId,
            `✅ Pedido encontrado (${pedido.tipo || 'N/A'}):\n\n📦 Pedido: ${pedido.pedido}\n🛍 Productos: ${productos}\n📋 Estado: ${pedido.estado || 'Sin información'}\n🚚 Guía: ${pedido.tracking || 'No asignada'}\n🏢 Transportadora: ${pedido.empresa_envio || 'N/A'}\n🔗 Rastreo: ${pedido.link || 'No disponible'}\n\n👤 Cliente: ${pedido.cliente || 'N/A'}\n📧 Correo: ${pedido.correo || 'N/A'}`
          );
          await setEstado(userId, 'inicio', 'menu_principal', { mostroMenu: false });
        } else {
          await whatsappService.sendMessage(userId, '❌ No encontré ningún pedido con ese número. Verifica si escribiste bien tu número de orden, guía o correo electronico.');
        }
      }
      break;

    case 'ia':
      if (estado.subestado === 'esperando_pregunta') {
        await handleAssistantFlow(userId, incomingMessage, senderInfo);
      }
      break;

    case 'factura':
      await factura(userId, incomingMessage, estado);
      break;

    case 'flujo':
      await resolverFlujo(userId, incomingMessage, estado);
      break;

    default: {
      // 🔹 Nuevo router híbrido

      // 1) Detectar intención
      const intencion = await detectarIntencionPipeline(incomingMessage, userId, estado.historial || []);
      let flujo = encontrarFlujoPorIntencion(intencion);

      // 2) Si no hay flujo exacto, buscar por keywords (Fuse.js)
      if (!flujo) flujo = buscarFlujoPorKeywords(incomingMessage);

      // 3) Si encontró flujo → ejecutarlo y salir
      if (flujo) {
        await ejecutarFlujoConversacional(userId, flujo);
        return;
      }

      // 4) Menú principal si corresponde
      if (estado.estado === 'inicio' && estado.subestado === 'menu_principal') {
        if (!estado.mostroMenu) {
          await sendWelcomeMenu(userId);
          await updateEstado(userId, { mostroMenu: true });
        }
        return;
      }

      // 5) 🔹 IA (PDF + Gemini) si no hay flujo
      const { procesarConsultaLibre } = await import('../assistantOrchestrator.js');
      const respuestaSource = await procesarConsultaLibre(userId, incomingMessage, intencion);
      const respuesta = respuestaSource.texto;

      await whatsappService.sendMessage(userId, respuesta);

      // guardar historial
      const estadoActual = await getEstado(userId);
      const hist = estadoActual?.historial || [];
      hist.push({ tipo: 'bot', texto: respuesta, timestamp: new Date().toISOString() });
      await (await import('../stateStore.js')).default.set(userId, {
        ...estadoActual,
        historial: hist,
        ultimaActualizacion: Date.now()
      });

      return;
    }
  }
}

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

  // 3. Intentos rápidos (ej: flujo por texto)
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
          await whatsappService.sendMessage(userId, '❌ No encontré ningún pedido con ese número. Verifica si escribiste bien tu número de orden o guía.');
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

    // case 'reporte_pedido': {
    //   if (estado.subestado === 'esperando_foto_equivocado') {
    //     await whatsappService.sendMessage(userId, "✅ Gracias por la foto. Revisaremos el caso de *producto equivocado* y nos pondremos en contacto pronto.");
    //     await resetEstado(userId);
    //     return;
    //   }
    //   if (estado.subestado === 'esperando_foto_danado') {
    //     await whatsappService.sendMessage(userId, "✅ Gracias por la foto. Hemos recibido tu reclamo de *producto dañado*. Nuestro equipo lo revisará.");
    //     await resetEstado(userId);
    //     return;
    //   }
    //   if (estado.subestado === 'esperando_texto_incompleto') {
    //     await whatsappService.sendMessage(userId, `✅ Hemos recibido tu mensaje sobre el pedido incompleto: "${incomingMessage}". Te daremos solución lo antes posible.`);
    //     await resetEstado(userId);
    //     return;
    //   }
    //   break;
    // }

    default: {
      // detectar intención con pipeline
      const intencion = await detectarIntencionPipeline(incomingMessage, userId, estado.historial || []);
      const flujo = encontrarFlujoPorIntencion(intencion);

      if (flujo?.intencion === 'estado_pedido') {
        await setEstado(userId, 'seguimiento', 'esperando_guia', { mostroMenu: false });
        await whatsappService.sendMessage(userId, 'Por favor, envíame tu número de orden (#3030) o tu número de guía 📦');
        return;
      }

      // ✅ Menú principal solo si no se mostró ya
      if (estado.estado === 'inicio' && estado.subestado === 'menu_principal') {
        if (!estado.mostroMenu) {
          await sendWelcomeMenu(userId);
          await updateEstado(userId, { mostroMenu: true });
        }
        return;
      }

      if (flujo) {
        await ejecutarFlujoConversacional(userId, flujo);
        return;
      }

      // fallback → saludo + menú inicial
      await sendWelcomeMessage(userId, senderInfo);
      await sendWelcomeMenu(userId);
      await setEstado(userId, 'inicio', 'menu_principal', { mostroMenu: true });
    }
  }
}

import { greetings, closingExpressions } from '../constants.js';
import stateStore from '../stateStore.js';
import detectarIntencion from '../../utils/intentionClassifier.js';
import { esEstadoVigente } from '../../utils/estadoUtils.js';

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
    sendWelcomeMessage
} from './menuHandler.js';
import whatsappService from '../whatsappService.js';

export default async function handleTextMessage(text, userId, senderInfo) {
    const incomingMessage = text.toLowerCase().trim();

    let estado = await stateStore.get(userId);
    if (!esEstadoVigente(estado)) {
        estado = { estado: 'inicio', subestado: 'menu_principal', historial: [] };
    }

    const historial = estado?.historial || [];
    historial.push({ tipo: 'usuario', texto: incomingMessage, timestamp: new Date().toISOString() });
    await stateStore.set(userId, { ...estado, historial, ultimaActualizacion: Date.now() });

    if (closingExpressions.some(exp => incomingMessage.includes(exp))) {
        const { cerrarChat } = await import('./menuHandler.js');
        return await cerrarChat(userId);
    }

    if (greetings.some(greet => incomingMessage.includes(greet))) {
        await sendWelcomeMessage(userId, senderInfo);
        await sendWelcomeMenu(userId);
        return;
    }

    switch (estado.estado) {
        case 'seguimiento':
            if (estado.subestado === 'esperando_guia') {
                await handleTrackingQuery(incomingMessage, userId);
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
            const intencion = detectarIntencion(incomingMessage);
            const flujo = encontrarFlujoPorIntencion(intencion);

            if (flujo?.intencion === 'factura') {
                await stateStore.set(userId, {
                    estado: 'factura', subestado: 'factura_electronica', ultimaActualizacion: Date.now()
                });
                await whatsappService.sendMessage(userId, 'Claro, indícanos tu número de pedido para emitir tu factura electrónica 🧾');
                return;
            }

            if (estado.estado === 'inicio' && estado.subestado === 'menu_principal') {
                await sendWelcomeMenu(userId); // O un mensaje fijo tipo: await whatsappService.sendMessage(userId, "¿Cómo puedo ayudarte hoy?");
                return;
            }

            if (flujo) {
                await ejecutarFlujoConversacional(userId, flujo);
                return;
            }

            await sendWelcomeMessage(userId, senderInfo);
            await sendWelcomeMenu(userId);
            await stateStore.set(userId, {
                estado: 'inicio', subestado: 'menu_principal', ultimaActualizacion: Date.now()
            });
        }
    }
}

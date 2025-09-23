// src/services/handlers/flujoHandler.js
import whatsappService from '../whatsappService.js';
import flowRouter from '../../../data/flowRouter.js';
import { encontrarOpcionParecida } from '../../utils/textFormatter.js';
import { sendWelcomeMenu } from './menuHandler.js';
import puntosVentaPorCiudad from '../../../data/puntosVentaPorCiudad.js';
import { setEstado } from '../../utils/stateManager.js';

export function encontrarFlujoPorIntencion(intencion) {
  const flujos = Object.values(flowRouter || {});
  return flujos.find(f => f.intencion === intencion);
}

export function obtenerMensajePuntosVenta(ciudad) {
  const clave = ciudad.trim().toLowerCase();
  const tiendas = puntosVentaPorCiudad[clave];

  if (!tiendas) {
    return `😕 Lo siento, no tenemos puntos de venta registrados en *${ciudad}*. Puedes intentar con otra ciudad.`;
  }

  return `🏬 *Puntos de venta en ${ciudad.charAt(0).toUpperCase() + ciudad.slice(1)}:*\n\n${tiendas.map(t => `- ${t}`).join('\n')}`;
}

export async function ejecutarFlujoConversacional(userId, flujo) {
  await whatsappService.sendMessage(userId, `📝 *${flujo.nombre}*`);
  await whatsappService.sendMessage(userId, flujo.pregunta);

  if (flujo.opciones?.length) {
    if (flujo.opciones.length <= 3) {
      const botones = flujo.opciones.map((opt, idx) => ({
        type: 'reply',
        reply: { id: `flujo_${flujo.step}_opt_${idx}`, title: opt }
      }));
      await whatsappService.sendInteractiveButtons(userId, "Elige una opción:", botones);
    } else {
      const rows = flujo.opciones.map((opt, idx) => ({
        id: `flujo_${flujo.step}_opt_${idx}`,
        title: opt.slice(0, 24)
      }));
      await whatsappService.sendListMessage(userId, {
        header: `📋 ${flujo.nombre}`,
        body: flujo.pregunta,
        footer: "Selecciona una opción para continuar.",
        buttonText: "Ver opciones",
        sections: [{ title: "Opciones disponibles", rows }]
      });
    }
  }

  await setEstado(userId, 'flujo', flujo.step, { flujo_actual: flujo });
}

export async function resolverFlujo(userId, input, estado) {
  const flujo = estado.flujo_actual;
  const opciones = flujo.opciones || [];

  let opcionElegida = input;

  if (opciones.length > 0) {
    const index = encontrarOpcionParecida(opciones, input);
    if (index === -1) {
      await whatsappService.sendMessage(userId, "❌ Opción no válida. Intenta seleccionar desde el menú.");
      return;
    }
    opcionElegida = opciones[index];
    await whatsappService.sendMessage(userId, `✅ Has seleccionado: *${opcionElegida}*`);
  } else {
    await whatsappService.sendMessage(userId, `✅ Has escrito: *${opcionElegida}*`);
  }

  if (flowRouter[flujo.step]) {
    await flowRouter[flujo.step](userId, opcionElegida, whatsappService);
  } else {
    await whatsappService.sendMessage(userId, "⚠️ Este flujo aún no está configurado.");
  }

  await sendWelcomeMenu(userId);
  await setEstado(userId, 'inicio', 'menu_principal');
}

export async function resolverSeleccionFlujo(userId, optionId, estado) {
  const flujo = estado?.flujo_actual;
  if (!flujo) {
    await whatsappService.sendMessage(userId, "⚠️ No tengo contexto del flujo actual. Escribe *menu* para empezar de nuevo.");
    return;
  }

  const partes = optionId.split('_');
  const index = parseInt(partes.at(-1));
  const opciones = flujo.opciones || [];
  const opcionElegida = opciones[index];

  if (!opcionElegida || typeof opcionElegida !== 'string') {
    console.warn(`⚠️ Opción inválida: index ${index} en flujo "${flujo.step}".`);
    await whatsappService.sendMessage(userId, "❌ Hubo un problema con tu selección. Intenta nuevamente o escribe *menu*.");
    return;
  }

  await whatsappService.sendMessage(userId, `✅ Has seleccionado: *${opcionElegida}*`);

  if (["Producto equivocado", "Producto dañado", "Pedido incompleto"].includes(opcionElegida)) {
    if (opcionElegida === "Producto equivocado") {
      await whatsappService.sendMessage(userId, "📦 Parece que recibiste un producto diferente al que pediste. Por favor compártenos una foto del producto recibido.");
      await setEstado(userId, 'reclamo', 'esperando_foto_equivocado');
    }

    if (opcionElegida === "Producto dañado") {
      await whatsappService.sendMessage(userId, "😥 Vaya, recibiste un producto dañado. Por favor envíanos una foto o video.");
      await setEstado(userId, 'reclamo', 'esperando_foto_danado');
    }

    if (opcionElegida === "Pedido incompleto") {
      await whatsappService.sendMessage(userId, "📝 Indícanos qué producto faltó en tu pedido.");
      await setEstado(userId, 'reclamo', 'esperando_texto_incompleto');
    }

    return;
  }

  const claveRespuesta = 'respuesta_' + opcionElegida
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const respuesta = flujo[claveRespuesta];

  if (respuesta) {
    const mensajes = Array.isArray(respuesta) ? respuesta : [respuesta];
    for (const mensaje of mensajes) {
      await whatsappService.sendMessage(userId, mensaje);
    }
  } else if (flowRouter[flujo.step]) {
    await flowRouter[flujo.step](userId, opcionElegida, whatsappService);
  } else {
    await whatsappService.sendMessage(userId, "⚠️ Este flujo aún no tiene acción configurada.");
  }

  await sendWelcomeMenu(userId);
  await setEstado(userId, 'inicio', 'menu_principal');
}

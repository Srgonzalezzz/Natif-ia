// src/services/handlers/flujoHandler.js
import whatsappService from '../whatsappService.js';
import flowRouter from '../../../data/flowRouter.js';
import { encontrarOpcionParecida } from '../../utils/textFormatter.js';
import { sendWelcomeMenu } from './menuHandler.js';
import puntosVentaPorCiudad from '../../../data/puntosVentaPorCiudad.js';
import { setEstado } from '../../utils/stateManager.js';

// ----------------------
// Helpers internos
// ----------------------
function normalizarClaveRespuesta(opcion) {
  return 'respuesta_' + opcion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

async function manejarReclamo(userId, opcionElegida) {
  const reclamos = {
    "Producto equivocado": {
      mensaje: "📦 Parece que recibiste un producto diferente al que pediste. Por favor compártenos una foto del producto recibido.",
      estado: ['reclamo', 'esperando_foto_equivocado']
    },
    "Producto dañado": {
      mensaje: "😥 Vaya, recibiste un producto dañado. Por favor envíanos una foto o video.",
      estado: ['reclamo', 'esperando_foto_danado']
    },
    "Pedido incompleto": {
      mensaje: "📝 Indícanos qué producto faltó en tu pedido.",
      estado: ['reclamo', 'esperando_texto_incompleto']
    }
  };

  const reclamo = reclamos[opcionElegida];
  if (!reclamo) return false;

  await whatsappService.sendMessage(userId, reclamo.mensaje);
  await setEstado(userId, ...reclamo.estado);
  return true;
}

async function finalizarFlujo(userId) {
  await sendWelcomeMenu(userId);
  await setEstado(userId, 'inicio', 'menu_principal');
}

// ----------------------
// Export functions
// ----------------------
export function encontrarFlujoPorIntencion(intencion) {
  return Object.values(flowRouter || {}).find(f => f.intencion === intencion);
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
      return whatsappService.sendMessage(userId, "❌ Opción no válida. Intenta seleccionar desde el menú.");
    }
    opcionElegida = opciones[index];
  }

  await whatsappService.sendMessage(userId, `✅ Has seleccionado: *${opcionElegida}*`);

  if (await manejarReclamo(userId, opcionElegida)) return;

  const claveRespuesta = normalizarClaveRespuesta(opcionElegida);
  const respuesta = flujo[claveRespuesta];

  if (respuesta) {
    const mensajes = Array.isArray(respuesta) ? respuesta : [respuesta];
    for (const mensaje of mensajes) {
      await whatsappService.sendMessage(userId, mensaje);
    }
  } else if (flowRouter[flujo.step]) {
    await flowRouter[flujo.step](userId, opcionElegida, whatsappService);
  } else {
    await whatsappService.sendMessage(userId, "⚠️ Este flujo aún no está configurado.");
  }

  await finalizarFlujo(userId);
}

export async function resolverSeleccionFlujo(userId, optionId, estado) {
  const flujo = estado?.flujo_actual;
  if (!flujo) {
    return whatsappService.sendMessage(userId, "⚠️ No tengo contexto del flujo actual. Escribe *menu* para empezar de nuevo.");
  }

  const index = parseInt(optionId.split('_').at(-1));
  const opcionElegida = flujo.opciones?.[index];

  if (!opcionElegida) {
    console.warn(`⚠️ Opción inválida: index ${index} en flujo "${flujo.step}".`);
    return whatsappService.sendMessage(userId, "❌ Hubo un problema con tu selección. Intenta nuevamente o escribe *menu*.");
  }

  await whatsappService.sendMessage(userId, `✅ Has seleccionado: *${opcionElegida}*`);

  if (await manejarReclamo(userId, opcionElegida)) return;

  const claveRespuesta = normalizarClaveRespuesta(opcionElegida);
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

  await finalizarFlujo(userId);
}

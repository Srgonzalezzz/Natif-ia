import stateStore from '../stateStore.js';
import whatsappService from '../whatsappService.js';
import flowRouter from '../../../data/flowRouter.js';
import flujosConversacionales from '../../../data/flows.js'; // ✅ Import estático correcto
import { encontrarOpcionParecida } from '../../utils/textFormatter.js';
import { sendWelcomeMenu } from './menuHandler.js';
import puntosVentaPorCiudad from '../../../data/puntosVentaPorCiudad.js';


export function encontrarFlujoPorIntencion(intencion) {
  const flujos = Object.values(flujosConversacionales);
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

  await stateStore.set(userId, {
    estado: 'flujo',
    subestado: flujo.step,
    flujo_actual: flujo,
    ultimaActualizacion: Date.now()
  });
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
    // Confirmación en flujos sin opciones (como ciudades)
    await whatsappService.sendMessage(userId, `✅ Has escrito: *${opcionElegida}*`);
  }

  if (flowRouter[flujo.step]) {
    await flowRouter[flujo.step](userId, opcionElegida, whatsappService);
  } else {
    await whatsappService.sendMessage(userId, "⚠️ Este flujo aún no está configurado.");
  }

  await sendWelcomeMenu(userId);
  await stateStore.set(userId, {
    estado: 'inicio',
    subestado: 'menu_principal',
    ultimaActualizacion: Date.now()
  });
}

export async function resolverSeleccionFlujo(userId, optionId, estado) {
  const flujo = estado?.flujo_actual;
  if (!flujo) {
    await whatsappService.sendMessage(userId, "No tengo contexto del flujo actual. Escribe *menu* para empezar de nuevo.");
    return;
  }

  const [_, step, __, index] = optionId.split('_');
  const opcionElegida = flujo.opciones?.[parseInt(index)];

  if (!opcionElegida || typeof opcionElegida !== 'string') {
    await whatsappService.sendMessage(userId, "❌ Hubo un problema con tu selección. Intenta nuevamente.");
    return;
  }

  await whatsappService.sendMessage(userId, `✅ Has seleccionado: *${opcionElegida}*`);

  if (flowRouter[flujo.step]) {
    const resultado = await flowRouter[flujo.step](userId, opcionElegida, whatsappService);
    const estadoActual = await stateStore.get(userId);
    const historial = estadoActual?.historial || [];

    if (resultado?.tipo === 'texto' && resultado.contenido) {
      historial.push({
        tipo: 'bot',
        texto: resultado.contenido,
        timestamp: new Date().toISOString()
      });
    }

    await stateStore.set(userId, {
      ...estadoActual,
      historial,
      ultimaActualizacion: Date.now()
    });
  } else {
    await whatsappService.sendMessage(userId, "⚠️ Este flujo aún no está configurado.");
  }

  await sendWelcomeMenu(userId);
  await stateStore.set(userId, {
    estado: 'inicio',
    subestado: 'menu_principal',
    ultimaActualizacion: Date.now()
  });

}

import whatsappService from '../whatsappService.js';
import { productos } from '../productCatalog.js'; // ✅ CORRECTA
import stateStore from '../stateStore.js';

export async function sendWelcomeMessage(to, senderInfo) {
  const name = senderInfo?.profile?.name || senderInfo?.wa_id || "Cliente";
  await whatsappService.sendMessage(to, `🌟 ¡Hola ${name}! Soy la IA NATIF 🤖\nEstoy aquí para ayudarte con tus pedidos, compras o cualquier duda que tengas 😊`);
}

export async function sendWelcomeMenu(to) {
  const buttons = [
    { type: 'reply', reply: { id: 'opcion_1', title: 'CONSULTAR PEDIDO' } },
    { type: 'reply', reply: { id: 'opcion_2', title: 'COMPRAR PRODUCTO' } },
    { type: 'reply', reply: { id: 'opcion_3', title: 'IA NATIF' } }
  ];
  await whatsappService.sendInteractiveButtons(to, "¿Cómo más puedo ayudarte el día de hoy?", buttons);
}

export async function handleMenuOption(userId, option) {
  const lowerOpt = option.toLowerCase();
  if (lowerOpt.includes('consultar')) {
    await stateStore.set(userId, { estado: 'seguimiento', subestado: 'esperando_guia', ultimaActualizacion: Date.now() });
    return await whatsappService.sendMessage(userId, 'Por favor, envíame tu número de guía para rastrear tu pedido 📦');
  } else if (lowerOpt.includes('comprar')) {
    await whatsappService.sendListMessage(userId, {
      header: "🍫 Catálogo NATIF",
      body: "Selecciona el producto que deseas agregar a tu carrito.",
      footer: "Puedes seguir agregando más luego.",
      buttonText: "Ver productos",
      sections: [
        {
          title: "Productos NATIF",
          rows: productos.map(p => ({
            id: p.id,
            title: p.nombre,
            description: p.descripcion
          }))
        }
      ]
    });
    await stateStore.set(userId, {
      ultimaActualizacion: Date.now(),
      estado: 'carrito',
      subestado: 'seleccionando_producto',
      carrito: []
    });
  } else if (lowerOpt.includes('ia natif')) {
    await stateStore.set(userId, {
      estado: 'ia',
      subestado: 'esperando_pregunta',
      ultimaActualizacion: Date.now()
    });
    const { setInactivityTimers } = await import('./inactivityTimers.js');
    setInactivityTimers(userId);
    await whatsappService.sendMessage(userId, 'Genial! Soy la IA NATIF y estoy aquí para ayudarte 🤖');
  } else {
    await whatsappService.sendMessage(userId, 'Lo siento, tu mensaje no fue claro');
  }
}

export async function handleFeedbackButtons(userId, option) {
  const soporte = '573006888304';

  switch (option.toLowerCase()) {
    case 'si, gracias':
      return await cerrarChat(userId);
    case 'otra pregunta':
      await whatsappService.sendMessage(userId, '¡Perfecto! Puedes escribirme tu siguiente inquietud.');
      await stateStore.set(userId, { estado: 'ia', subestado: 'esperando_pregunta', ultimaActualizacion: Date.now() });
      break;
    case 'hablar con soporte':
      await whatsappService.sendMessage(userId, 'Conectándote con nuestro equipo de soporte humano… Un momento por favor 👩‍💻');
      await whatsappService.sendMessage(soporte, `📞 El cliente ${userId} solicitó soporte humano.`);
      await stateStore.delete(userId);
      break;
  }
}

export async function cerrarChat(userId) {
  const { clearUserTimers } = await import('./inactivityTimers.js');
  await clearUserTimers(userId);
  await whatsappService.sendMessage(userId, "✨ ¡Gracias por confiar en nosotros! Si vuelves a necesitar ayuda, solo escríbeme por este mismo chat 💬. ¡Que tengas un excelente día! 🙌");
  await stateStore.delete(userId);
}

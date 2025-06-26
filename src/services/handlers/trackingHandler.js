import { buscarPedidoPorGuia } from '../shopifyService.js';
import stateStore from '../stateStore.js';
import whatsappService from '../whatsappService.js';
import { sendWelcomeMenu } from './menuHandler.js'; // ✅ Importación correcta

export async function handleTrackingQuery(trackingRaw, userId) {
  const trackingNumber = trackingRaw.replace(/\s/g, '').toUpperCase();

  if (!/^[A-Z0-9]{8,20}$/.test(trackingNumber)) {
    return await whatsappService.sendMessage(
      userId,
      "⚠️ El número de guía no parece válido. Por favor verifica que tenga entre 8 y 20 caracteres alfanuméricos, sin símbolos."
    );
  }

  const resultado = await buscarPedidoPorGuia(trackingNumber);

  if (resultado) {
    const respuesta = `📦 Tu pedido *${resultado.pedido}* está *${resultado.estado || 'sin actualizar'}* con *${resultado.empresa_envio || 'transportadora no especificada'}*.\n\nNúmero de guía: *${resultado.tracking}*\n🔗 Rastreo: ${resultado.link || 'No disponible'}\n💼 Productos: ${resultado.productos.join(', ')}\n📧 Cliente: ${resultado.cliente}`;
    await whatsappService.sendMessage(userId, respuesta);
  } else {
    await whatsappService.sendMessage(userId, "No encontré ningún pedido con ese número de guía 😔. Por favor verifica que esté correcto.");
  }

  await stateStore.set(userId, {
    step: 'esperando_interaccion',
    ultimaActualizacion: Date.now()
  });

  setTimeout(async () => {
    await whatsappService.sendMessage(userId, "¿Deseas hacer otra consulta o recibir más ayuda? Aquí tienes el menú nuevamente:");
    await sendWelcomeMenu(userId); // ✅ Usamos directamente la función
  }, 1500);
}

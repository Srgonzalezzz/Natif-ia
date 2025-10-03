// src/services/handlers/trackingHandler.js
import { buscarPedido } from '../shopifyService.js';
import whatsappService from '../whatsappService.js';
import { setEstado } from '../../utils/stateManager.js';
import { sendWelcomeMenu } from './menuHandler.js';

export async function handleTrackingQuery(trackingRaw, userId) {
  const raw = String(trackingRaw || '').trim();

  // detecta #3030 o similar (orden interna)
  const ordenMatch = raw.match(/#\s*(\d{3,10})/) || raw.match(/^(\d{3,10})$/);
  if (ordenMatch && raw.includes('#')) {
    const orderNumber = ordenMatch[1];
    const p = await buscarPedido(orderNumber);
    if (p) {
      await whatsappService.sendMessage(userId, `✅ Pedido ${orderNumber}: estado ${p.estado || 'N/A'}\nProductos: ${p.productos?.join(', ') || 'N/A'}`);
      await setEstado(userId, 'inicio', 'menu_principal');
      await sendWelcomeMenu(userId);
      return;
    }
  }

  // validar guía alfanumérica
  const tracking = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z0-9\-]{6,30}$/.test(tracking)) {
    return await whatsappService.sendMessage(userId, "⚠️ No parece un número de orden o guía válido. ¿Quieres intentar con tu número de orden (#3030), con el número de guía de la transportadora o tu correo electronico?");
  }

  const resultado = await buscarPedido(tracking);

  if (resultado) {
    await whatsappService.sendMessage(userId, `📦 Tu pedido *${resultado.pedido}* está *${resultado.estado || 'sin actualizar'}* con *${resultado.empresa_envio || 'transportadora no especificada'}*.\n\nNúmero de guía: *${resultado.tracking}*\n🔗 Rastreo: ${resultado.link || 'No disponible'}\n💼 Productos: ${resultado.productos?.join(', ') || 'N/A'}\n📧 Cliente: ${resultado.cliente || 'N/A'}`);
  } else {
    await whatsappService.sendMessage(userId, "No encontré ningún pedido con ese número de guía 😔. Por favor verifica que esté correcto o intenta con tu número de orden (#3030) o tu correo electronico de shopify.");
  }

  await setEstado(userId, 'inicio', 'menu_principal');
  await sendWelcomeMenu(userId);
}

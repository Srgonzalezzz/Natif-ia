import whatsappService from '../whatsappService.js';
import { productos } from '../productCatalog.js';
import stateStore from '../stateStore.js';
import { limitarTitulo } from '../../utils/whatsappUtils.js';
import { generarLinkCarritoMultiple } from '../shopifyCartLink.js';

export async function handleSeguirComprando(userId) {
  await whatsappService.sendListMessage(userId, {
    header: "🛒 Productos disponibles",
    body: "Selecciona un producto para agregarlo al carrito, recuerda que viene x12 Unidades.",
    footer: "Puedes agregar varios productos antes de pagar.",
    buttonText: "Ver productos",
    sections: [
      {
        title: "Catálogo NATIF",
        rows: productos.map(p => ({
          id: p.id,
          title: p.nombre.slice(0, 24),
          description: p.descripcion?.slice(0, 40) || ''
        }))
      }
    ]
  });
}

export async function handleVerCarrito(userId, estado) {
  const carrito = estado?.carrito || [];

  if (carrito.length === 0) {
    await whatsappService.sendMessage(userId, "Tu carrito está vacío 🛒");
    return;
  }

  const resumen = formatearResumenCarrito(carrito);
  await whatsappService.sendMessage(userId, `🧾 Aquí está tu carrito:\n${resumen}`);

  await whatsappService.sendListMessage(userId, {
    header: "🗑 Productos en tu carrito",
    body: "Selecciona el producto que deseas eliminar",
    footer: "Solo puedes quitar uno a la vez (por ahora)",
    buttonText: "Eliminar producto",
    sections: [
      {
        title: "Eliminar del carrito",
        rows: carrito.map((item, i) => ({
          id: `eliminar_${i}`,
          title: limitarTitulo(item.nombre, 24),
          description: `Cantidad: ${item.cantidad || 1}`
        }))
      }
    ]
  });
}

export async function handleFinalizarCompra(userId, estado) {
  const carrito = estado?.carrito || [];
  if (carrito.length === 0) {
    await whatsappService.sendMessage(userId, "Tu carrito está vacío 🛒");
    return;
  }

  const resumen = formatearResumenCarrito(carrito);
  await whatsappService.sendMessage(userId, `🧾 Tu carrito:\n${resumen}`);

  const link = generarLinkCarritoMultiple(carrito);
  await whatsappService.sendMessage(userId, `🛒 ¡Listo! Aquí tienes tu link para finalizar la compra:\n${link}`);

  const { sendWelcomeMenu } = await import('./menuHandler.js');
  await sendWelcomeMenu(userId);
}

export async function handleEliminarProducto(userId, optionId, estado) {
  const index = Number(optionId.split('_')[1]);
  let carrito = estado.carrito || [];

  if (!isNaN(index) && carrito[index]) {
    const eliminado = carrito.splice(index, 1)[0];
    await whatsappService.sendMessage(userId, `🗑️ Producto eliminado: *${eliminado.nombre}*`);
    await stateStore.set(userId, {
      ...estado,
      step: 'seleccionando_producto',
      carrito,
      ultimaActualizacion: Date.now()
    });
  } else {
    await whatsappService.sendMessage(userId, "No pude identificar el producto a eliminar. Intenta nuevamente.");
    return;
  }

  if (carrito.length === 0) {
    await whatsappService.sendMessage(userId, "Tu carrito ahora está vacío 🛒");
    return await sendPostCarritoOptions(userId);
  }

  const resumen = formatearResumenCarrito(carrito);
  await whatsappService.sendMessage(userId, `🧾 Carrito actualizado:\n${resumen}`);
  return await sendPostCarritoOptions(userId);
}

export async function handleProductoSeleccionado(userId, optionId, optionTitle, estado) {
  const productoElegido = productos.find(p =>
    p.id === optionId || p.nombre.toLowerCase().trim() === optionTitle
  );

  if (!productoElegido) {
    await whatsappService.sendMessage(userId, "Producto no reconocido. Intenta nuevamente.");
    return;
  }

  const carrito = estado.carrito || [];
  const existente = carrito.find(item => item.variantId === productoElegido.variantId);

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      variantId: productoElegido.variantId,
      nombre: productoElegido.nombre,
      cantidad: 1
    });
  }

  await stateStore.set(userId, {
    estado: 'carrito',
    subestado: 'seleccionando_producto',
    carrito,
    ultimaActualizacion: Date.now()
  });

  const resumen = formatearResumenCarrito(carrito);
  await whatsappService.sendMessage(userId, `🧾 Productos en tu carrito:\n${resumen}`);

  return await sendPostCarritoOptions(userId);
}

export function formatearResumenCarrito(carrito) {
  return carrito.map((item, i) =>
    `*${i + 1}.* ${item.nombre} (x${item.cantidad})`
  ).join('\n');
}

export async function sendPostCarritoOptions(userId) {
  await whatsappService.sendInteractiveButtons(userId, "¿Qué deseas hacer ahora?", [
    { type: 'reply', reply: { id: 'seguir_comprando', title: "AGREGAR PRODUCTO" } },
    { type: 'reply', reply: { id: 'ver_carrito', title: "VER CARRITO" } },
    { type: 'reply', reply: { id: 'finalizar_compra', title: "FINALIZAR COMPRA" } }
  ]);
}

export async function handleAccionCarrito(optionId, userId, estado) {
  switch (optionId) {
    case 'seguir_comprando':
      return await handleSeguirComprando(userId);
    case 'ver_carrito':
      return await handleVerCarrito(userId, estado);
    case 'finalizar_compra':
      return await handleFinalizarCompra(userId, estado);
  }
}

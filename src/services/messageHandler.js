// src/services/messageHandler.js
import whatsappService from './whatsappService.js';
import buscarEnDocumentoLocal from './localKnowledge.js';
import stateStore from './stateStore.js';
import { greetings, closingExpressions } from './constants.js';
import GeminiService from './geminiService.js';
import { registrarLog } from '../utils/googleOAuthLogger.js';
import detectarIntencion from '../utils/intentionClassifier.js';
import { formatearRespuesta, formatearPorClave } from '../utils/textFormatter.js';
import { buscarPedidoPorGuia } from './shopifyService.js';
import { productos } from './productCatalog.js';
import flujosConversacionales from '../../data/flows.js';
import { generarLinkCarritoMultiple } from './shopifyCartLink.js';
import { limitarTitulo } from '../utils/whatsappUtils.js';
import { buscarPedidoPorNumero } from './shopifyService.js';
import { guardarFacturaEnSheet } from '../utils/googleOAuthLogger.js';

class MessageHandler {
  // Verifica que el mensaje sea válido, Detecta si es texto o interacción,
  // Llama al handler apropiado, Marca el mensaje como leído, Maneja errores con seguridad.
  async handleIncomingMessage(message, senderInfo) {
    if (!message) return;

    try {
      const userId = message.from;

      if (message.type === 'text' && message.text?.body) {
        await this.handleTextMessage(message.text.body, userId, senderInfo);
      } else if (message.type === 'interactive') {
        await this.handleInteractiveMessage(message);
      }

      await whatsappService.markAsRead(message.id);
    } catch (error) {
      console.error("Error al manejar mensaje entrante:", error);
    }
  }

  // Limpia temporizadores, Envía una despedida al usuario, Elimina todo el estado del chat.
  async cerrarChat(userId) {
    await this.clearUserTimers(userId);
    await whatsappService.sendMessage(userId, "✨ ¡Gracias por confiar en nosotros! Si vuelves a necesitar ayuda, solo escríbeme por este mismo chat 💬. ¡Que tengas un excelente día! 🙌");
    await stateStore.delete(userId);
  }

  //Guarda el mensaje en el historial, Detecta saludos o despedidas, Ejecuta flujos activos (seguimiento, factura, IA), 
  // Clasifica intenciones nuevas, Muestra el menú si no se detecta una intención válida.
  async handleTextMessage(text, userId, senderInfo) {
    const incomingMessage = text.toLowerCase().trim();

    let estado = await stateStore.get(userId);
    if (!esEstadoVigente(estado)) {
      estado = { estado: 'inicio', subestado: 'menu_principal', historial: [] };
    }
    const historial = estado?.historial || [];

    historial.push({ tipo: 'usuario', texto: incomingMessage, timestamp: new Date().toISOString() });
    await stateStore.set(userId, {
      ...estado, historial, ultimaActualizacion: Date.now()
    });


    if (closingExpressions.some(exp => incomingMessage.includes(exp))) {
      return await this.cerrarChat(userId);
    }

    if (greetings.some(greet => incomingMessage.includes(greet))) {
      await this.sendWelcomeMessage(userId, senderInfo);
      await this.sendWelcomeMenu(userId);
      return;
    }

    // const estado = await stateStore.get(userId) || { step: 'esperando_interaccion' };
    switch (estado.estado) {
      case 'seguimiento':
        if (estado.subestado === 'esperando_guia') {
          await this.handleTrackingQuery(incomingMessage, userId);
        }
        break;

      case 'ia':
        if (estado.subestado === 'esperando_pregunta') {
          await this.handleAssistantFlow(userId, incomingMessage, senderInfo);
        }
        break;

      case 'factura':
        await this.factura(userId, incomingMessage, estado);
        break;


      default: {
        const intencion = detectarIntencion(incomingMessage);
        const flujo = Object.values(flujosConversacionales).find(f => f.intencion === intencion);

        if (flujo?.intencion === 'factura') {
          await stateStore.set(userId, {
            estado: 'factura', subestado: 'factura_electronica', ultimaActualizacion: Date.now()
          });
          await whatsappService.sendMessage(userId, 'Claro, indícanos tu número de pedido para emitir tu factura electrónica 🧾');
          return;
        }

        if (estado.estado === 'inicio' && estado.subestado === 'menu_principal') {
          await whatsappService.sendMessage(userId, "💬 ¿Mi respuesta fue de ayuda?");
        }

        if (flujo) {
          await this.ejecutarFlujoConversacional(userId, flujo);
          return;
        }

        // Si no se detectó ninguna intención válida, mostrar menú
        await this.sendWelcomeMessage(userId, senderInfo);
        await this.sendWelcomeMenu(userId);
        await stateStore.set(userId, {
          estado: 'inicio', subestado: 'menu_principal', ultimaActualizacion: Date.now()
        });
      }

    }
  }

  // Verifica si el número de guía ingresado es válido, Consulta si hay un pedido asociado, 
  // Devuelve detalles del pedido o un mensaje de error, Restaura el estado y ofrece el menú nuevamente.
  async handleTrackingQuery(trackingRaw, userId) {
    const trackingNumber = trackingRaw.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z0-9]{8,20}$/.test(trackingNumber)) {
      return await whatsappService.sendMessage(userId, "⚠️ El número de guía no parece válido. Por favor verifica que tenga entre 8 y 20 caracteres alfanuméricos, sin símbolos.");
    }
    const resultado = await buscarPedidoPorGuia(trackingNumber);

    if (resultado) {
      const respuesta = `📦 Tu pedido *${resultado.pedido}* está *${resultado.estado || 'sin actualizar'}* con *${resultado.empresa_envio || 'transportadora no especificada'}*.

  Número de guía: *${resultado.tracking}*
  🔗 Rastreo: ${resultado.link || 'No disponible'}
  💼 Productos: ${resultado.productos.join(', ')}
  📧 Cliente: ${resultado.cliente}`;
      await whatsappService.sendMessage(userId, respuesta);
    } else {
      await whatsappService.sendMessage(userId, "No encontré ningún pedido con ese número de guía 😔. Por favor verifica que esté correcto.");
    }

    await stateStore.set(userId, {
      step: 'esperando_interaccion', ultimaActualizacion: Date.now()
    });
    setTimeout(async () => {
      await whatsappService.sendMessage(userId, "¿Deseas hacer otra consulta o recibir más ayuda? Aquí tienes el menú nuevamente:");
      await this.sendWelcomeMenu(userId);
    }, 1500);
  }

  // Responde a clics del usuario en botones o listas, Llama a funciones específicas dependiendo 
  // del contexto del flujo activo: Menú principal, Feedback ,Compra y carrito Catálogo de productos, 
  // Eliminación de productos, Sirve como nodo de control para interacciones no textuales en la experiencia conversacional.
  async handleInteractiveMessage(message) {
    const userId = message.from;
    const estado = await stateStore.get(userId);

    const optionId = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id;
    const optionTitle = message.interactive?.button_reply?.title?.toLowerCase().trim() ||
      message.interactive?.list_reply?.title?.toLowerCase().trim();

    // 1. Opción del menú principal
    if (["opcion_1", "opcion_2", "opcion_3"].includes(optionId)) {
      return await this.handleMenuOption(userId, optionTitle);
    }

    // 2. Opciones de retroalimentación
    if (["si, gracias", "otra pregunta", "hablar con soporte"].includes(optionTitle)) {
      return await this.handleFeedbackButtons(userId, optionTitle);
    }

    // 3. Acciones del carrito
    if (["seguir_comprando", "ver_carrito", "finalizar_compra"].includes(optionId)) {
      switch (optionId) {
        case 'seguir_comprando':
          return await this.handleSeguirComprando(userId);
        case 'ver_carrito':
          return await this.handleVerCarrito(userId, estado);
        case 'finalizar_compra':
          return await this.handleFinalizarCompra(userId, estado);
      }
    }

    if (optionId?.startsWith("eliminar_")) {
      return await this.handleEliminarProducto(userId, optionId, estado);
    }

    // 4. Selección de producto desde catálogo
    if (estado?.estado === 'carrito' && estado?.subestado === 'seleccionando_producto') {
      return await this.handleProductoSeleccionado(userId, optionId, optionTitle, estado);
    }

    // 5. Cualquier otra opción
    return await this.handleMenuOption(userId, optionTitle);
  }

  // Valida y reconoce el producto seleccionado, Lo agrega o actualiza en el carrito del usuario,
  // Guarda el estado actualizado con persistencia, Muestra un resumen del carrito,
  // Ofrece opciones para seguir el flujo de compra.
  async handleProductoSeleccionado(userId, optionId, optionTitle, estado) {
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

    const resumen = this.formatearResumenCarrito(carrito);
    await whatsappService.sendMessage(userId, `🧾 Productos en tu carrito:\n${resumen}`);

    return await this.sendPostCarritoOptions(userId);
  }

  // Convierte el contenido del carrito en un texto ordenado y entendible,
  // Muestra el nombre y la cantidad de cada producto.
  formatearResumenCarrito(carrito) {
    return carrito.map((item, i) =>
      `*${i + 1}.* ${item.nombre} (x${item.cantidad})`
    ).join('\n');
  }

  // Muestra un catálogo interactivo al usuario, Permite seleccionar productos fácilmente desde WhatsApp.
  async handleSeguirComprando(userId) {
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

  // Verifica si hay productos en el carrito, Muestra un resumen del contenido del carrito.
  async handleVerCarrito(userId, estado) {
    const carrito = estado?.carrito || [];

    if (carrito.length === 0) {
      await whatsappService.sendMessage(userId, "Tu carrito está vacío 🛒");
      return;
    }

    const resumen = this.formatearResumenCarrito(carrito);

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

  // Verifica que el carrito no esté vacío, Muestra al usuario el contenido de su compra,
  // Genera un link dinámico a Shopify con todos los productos.
  async handleFinalizarCompra(userId, estado) {
    const carrito = estado?.carrito || [];

    if (carrito.length === 0) {
      await whatsappService.sendMessage(userId, "Tu carrito está vacío 🛒");
      return;
    }

    const resumen = this.formatearResumenCarrito(carrito);

    await whatsappService.sendMessage(userId, `🧾 Tu carrito:\n${resumen}`);
    const link = generarLinkCarritoMultiple(carrito);
    await whatsappService.sendMessage(userId, `🛒 ¡Listo! Aquí tienes tu link para finalizar la compra:\n${link}`);

    await this.sendWelcomeMenu(userId);
  }

  // eleimar producto
  async handleEliminarProducto(userId, optionId, estado) {
    const index = Number(optionId.split('_')[1]);
    let carrito = estado.carrito || [];

    if (!isNaN(index) && carrito[index]) {
      const eliminado = carrito.splice(index, 1)[0];
      await whatsappService.sendMessage(userId, `🗑️ Producto eliminado: *${eliminado.nombre}*`);
      await stateStore.set(userId, {
        ...estado, step: 'seleccionando_producto', carrito, ultimaActualizacion: Date.now()
      });
    } else {
      await whatsappService.sendMessage(userId, "No pude identificar el producto a eliminar. Intenta nuevamente.");
      return;
    }

    const nuevoCarrito = carrito;

    if (nuevoCarrito.length === 0) {
      await whatsappService.sendMessage(userId, "Tu carrito ahora está vacío 🛒");
      return await this.sendPostCarritoOptions(userId);
    }

    const resumen = this.formatearResumenCarrito(nuevoCarrito);
    await whatsappService.sendMessage(userId, `🧾 Carrito actualizado:\n${resumen}`);
    return await this.sendPostCarritoOptions(userId);
  }

  // opciones de carrito
  async sendPostCarritoOptions(userId) {
    await whatsappService.sendInteractiveButtons(userId, "¿Qué deseas hacer ahora?", [
      { type: 'reply', reply: { id: 'seguir_comprando', title: "AGREGAR PRODUCTO" } },
      { type: 'reply', reply: { id: 'ver_carrito', title: "VER CARRITO" } },
      { type: 'reply', reply: { id: 'finalizar_compra', title: "FINALIZAR COMPRA" } }
    ]);
  }

  // MENU
  async handleMenuOption(userId, option) {
    const lowerOpt = option.toLowerCase();
    let response = '';

    if (lowerOpt.includes('consultar')) {
      await stateStore.set(userId, {
        estado: 'seguimiento', subestado: 'esperando_guia', ultimaActualizacion: Date.now()
      });
      response = 'Por favor, envíame tu número de guía para rastrear tu pedido 📦';
    } // Cuando se selecciona desde el menú "Comprar producto"
    else if (lowerOpt.includes('comprar')) {
      const botones = productos.map(p => ({
        type: 'reply',
        reply: { id: p.id, title: p.nombre.slice(0, 20) } // IMPORTANTE: máx 20 caracteres
      }));

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
        ultimaActualizacion: Date.now()
        , estado: 'carrito', subestado: 'seleccionando_producto', carrito: []
      });


    } else if (lowerOpt.includes('ia natif')) {
      await stateStore.set(userId, {
        estado: 'ia', subestado: 'esperando_pregunta', ultimaActualizacion: Date.now()
      });
      this.setInactivityTimers(userId);
      response = 'Genial! Soy la IA NATIF y estoy aquí para ayudarte 🤖';
    } else {
      response = 'Lo siento, tu mensaje no fue claro';
    }

    await whatsappService.sendMessage(userId, response);
  }

  // Clasifica la intención del mensaje recibido, Ejecuta flujos si existen (como factura o reclamos).
  // Si no hay flujo: Busca respuesta en documentos locales. O genera una respuesta con Gemini (IA).
  // Guarda la respuesta, actualiza historial y logs, Cierra el chat si aplica, y reinicia timers.
  async handleAssistantFlow(userId, message, senderInfo) {
    try {
      const state = await stateStore.get(userId);
      clearTimeout(state?.timeout);

      const intencion = detectarIntencion(message);

      if (intencion === 'reclamo') {
        await this.redirigirASoporte(userId, message, senderInfo);
        return;
      }

      const flujo = Object.values(flujosConversacionales).find(f => f.intencion === intencion);
      if (flujo?.intencion === 'factura') {
        await stateStore.set(userId, {
          estado: 'factura',
          subestado: 'factura_electronica',
          ultimaActualizacion: Date.now()

        });
        await whatsappService.sendMessage(userId, flujo.pregunta);
        return;
      }

      if (flujo) {
        await this.ejecutarFlujoConversacional(userId, flujo);
        return;
      }



      const respuestaLocal = await buscarEnDocumentoLocal(message);
      const respuesta = respuestaLocal
        ? formatearPorClave(intencion, Array.isArray(respuestaLocal) ? respuestaLocal.map(x => x.texto).join('\n') : respuestaLocal)
        : formatearRespuesta(await GeminiService(userId, message));

      await whatsappService.sendMessage(userId, respuesta);

      const actualizado = await stateStore.get(userId);
      const historial = actualizado?.historial || [];
      historial.push({ tipo: 'bot', texto: respuesta, timestamp: new Date().toISOString() });

      await stateStore.set(userId, {
        ...actualizado, historial, ultimaActualizacion: Date.now()
      });


      await registrarLog({
        userId,
        pregunta: message,
        respuesta,
        fuente: respuestaLocal ? 'local' : 'gemini',
        intencion: typeof intencion === 'object' ? JSON.stringify(intencion) : String(intencion)
      });

      if (closingExpressions.some(exp => message.includes(exp))) return await this.cerrarChat(userId);
      this.setInactivityTimers(userId);
    } catch (err) {
      console.error("Error en flujo IA:", err);
      await whatsappService.sendMessage(userId, "😓 Uy, algo salió mal procesando tu solicitud. Intenta nuevamente o escribe *menu* para volver al inicio.");
    }
  }

  // Inicia un flujo personalizado con nombre y pregunta inicial, Muestra botones si el flujo tiene opciones
  // definidas. Guarda el contexto del flujo en stateStore para continuar después.
  async ejecutarFlujoConversacional(userId, flujo) {
    await whatsappService.sendMessage(userId, `📝 *${flujo.nombre}*`);
    await whatsappService.sendMessage(userId, flujo.pregunta);

    if (flujo.opciones?.length) {
      const botones = flujo.opciones.map((opt, idx) => ({
        type: 'reply',
        reply: {
          id: `flujo_${flujo.step}_opt_${idx}`,
          title: opt
        }
      }));
      await whatsappService.sendInteractiveButtons(userId, "Elige una opción:", botones);
    }

    await stateStore.set(userId, {
      estado: 'flujo',
      subestado: flujo.step,
      flujo_actual: flujo,
      ultimaActualizacion: Date.now()

    });
  }

  // MENSAJE HACIA SOPORTE HUMANO
  async redirigirASoporte(userId, mensaje, senderInfo) {
    const estado = await stateStore.get(userId);
    const numeroSupervisor = '573006888304';
    const nombreCliente = senderInfo?.profile?.name || 'Cliente sin nombre';

    const plantilla = {
      name: 'reclamo_detectado',
      languageCode: 'es',
      parameters: [
        { type: 'text', text: nombreCliente },
        { type: 'text', text: mensaje },
        { type: 'text', text: userId }
      ]
    };

    try {
      await whatsappService.sendTemplateMessage(
        numeroSupervisor,
        plantilla.name,
        plantilla.languageCode,
        [
          { type: 'body', parameters: plantilla.parameters }
        ]
      );

      // Mensaje extra como respaldo para el asesor
      await whatsappService.sendMessage(
        numeroSupervisor,
        `📢 Reclamo recibido:\n\n👤 Cliente: *${nombreCliente}*\n📞 WhatsApp: ${userId}\n✉️ Reclamo: ${mensaje}`
      );

      await whatsappService.sendMessage(userId, "✅ Hemos recibido tu mensaje. Un asesor de NATIF se comunicará contigo muy pronto 🙏");
      await stateStore.delete(userId);
    } catch (error) {
      console.error("❌ Error notificando al asesor humano:", error.response?.data || error.message);
      await whatsappService.sendMessage(userId, "Hubo un error al contactar al equipo de soporte 😔. Intenta de nuevo más tarde.");
    }
  }

  // CIERRE DE INACTIVIDAD
  async clearUserTimers(userId) {
    const state = await stateStore.get(userId);
    if (state?.timeout) clearTimeout(state.timeout);
    if (state?.finalClosureTimeout) clearTimeout(state.finalClosureTimeout);
  }

  // ACCIONES DE INACTIVIDAD
  setInactivityTimers(userId) {
    const warningDelay = 60000;
    const finalDelay = 60000;

    const run = async () => {
      const currentState = await stateStore.get(userId);
      if (currentState?.timeout) clearTimeout(currentState.timeout);
      if (currentState?.finalClosureTimeout) clearTimeout(currentState.finalClosureTimeout);

      const timeout = setTimeout(async () => {
        const state = await stateStore.get(userId);
        if (!state) return;

        await whatsappService.sendInteractiveButtons(userId, "¿Mi respuesta fue de ayuda?", [
          { type: 'reply', reply: { id: 'option_4', title: "Si, gracias" } },
          { type: 'reply', reply: { id: 'option_5', title: "otra pregunta" } },
          { type: 'reply', reply: { id: 'option_6', title: "Hablar con soporte" } },
        ]);

        const finalClosureTimeout = setTimeout(async () => {
          const checkState = await stateStore.get(userId);
          if (!checkState) return;
          await whatsappService.sendMessage(userId, "Finalicé el chat por inactividad. Si necesitas más ayuda, saluda nuestro chat para comenzar de nuevo.");
          await stateStore.delete(userId);
        }, finalDelay);

        await stateStore.set(userId, {
          ...state, finalClosureTimeout, ultimaActualizacion: Date.now()
        });
      }, warningDelay);

      await stateStore.set(userId, {
        ...(currentState || {}), timeout, ultimaActualizacion: Date.now()
      });
    };

    run();
  }

  // MENU FINAL
  async handleFeedbackButtons(userId, option) {
    switch (option) {
      case 'si, gracias':
        await this.cerrarChat(userId);
        break;
      case 'otra pregunta':
        await whatsappService.sendMessage(userId, '¡Perfecto! Puedes escribirme tu siguiente inquietud.');
        await stateStore.set(userId, {
          estado: 'ia', subestado: 'esperando_pregunta', ultimaActualizacion: Date.now()
        });
        break;
      case 'hablar con soporte':
        await whatsappService.sendMessage(userId, 'Conectándote con nuestro equipo de soporte humano… Un momento por favor 👩‍💻');
        const redirigirASoporte = '573006888304';
        await whatsappService.sendMessage(redirigirASoporte, `📞 El cliente ${userId} solicitó soporte humano.`);
        await stateStore.delete(userId);
        break;
    }
  }

  // IA NATIF
  async sendWelcomeMessage(to, senderInfo) {
    const name = senderInfo?.profile?.name || senderInfo?.wa_id || "Cliente";
    await whatsappService.sendMessage(to, `🌟 ¡Hola ${name}! Soy la IA NATIF 🤖\nEstoy aquí para ayudarte con tus pedidos, compras o cualquier duda que tengas 😊`);
  }

  // MENU PRINCIPAL
  async sendWelcomeMenu(to) {
    const buttons = [
      { type: 'reply', reply: { id: 'opcion_1', title: 'CONSULTAR PEDIDO' } },
      { type: 'reply', reply: { id: 'opcion_2', title: 'COMPRAR PRODUCTO' } },
      { type: 'reply', reply: { id: 'opcion_3', title: 'IA NATIF' } }
    ];
    await whatsappService.sendInteractiveButtons(to, "¿Cómo más puedo ayudarte el dia de hoy?", buttons);
  }

  // PROCESO PARA FACTURA ELECTRONICA
  async factura(userId, messageText, estado) {
    const flujo = flujosConversacionales['flujo_4'];
    const step = estado.subestado;
    const texto = messageText.trim();

    if (step === 'factura_electronica') {
      const pedido = await buscarPedidoPorNumero(texto);

      if (!pedido) {
        await whatsappService.sendMessage(userId, "⚠️ No encontramos ese número de pedido. Asegúrate de escribirlo correctamente, como por ejemplo: #3075.");
        return;
      }

      await whatsappService.sendMessage(userId, `✅ Pedido encontrado:\n*Pedido:* ${pedido.pedido}\n*Cliente:* ${pedido.cliente}\n*Productos:* ${pedido.productos.join(', ')}`);
      await whatsappService.sendMessage(userId, "Para emitir la factura necesito algunos datos adicionales. Vamos uno por uno 😊");

      const siguienteCampo = flujo.datos_requeridos[0];
      await whatsappService.sendMessage(userId,
        `Para emitir la factura, por favor indícame los siguientes datos separados por comas (en ese orden):\n\n` +
        `*1.* Nombre / Razón social\n` +
        `*2.* NIT o Cédula\n` +
        `*3.* Dirección\n` +
        `*4.* Ciudad\n` +
        `*5.* Correo\n\n` +
        `Ejemplo:\nNATIF S.A.S, 900123456, Calle 123 #45-67, Bogotá, facturas@natif.com`
      );

      await stateStore.set(userId, {
        estado: 'factura',
        subestado: 'esperando_datos_factura',
        datos_factura: {
          pedido: texto,
          cliente: pedido.cliente,
          productos: pedido.productos,
          ultimaActualizacion: Date.now()

        }
      });

      return; // 🔁 Cortamos aquí porque el resto de datos aún no han sido enviados
    }

    if (step === 'esperando_datos_factura') {
      const partes = texto.split(',').map(p => p.trim());
      const [razon, nit, direccion, ciudad, correo] = partes;

      const datosFactura = {
        ...estado.datos_factura,
        "Nombre / Razón social": razon,
        "NIT o Cédula": nit,
        "Dirección": direccion,
        "Ciudad": ciudad,
        "Correo": correo
      };

      // ✅ Guardar en Sheets ahora que tenemos todo
      await guardarFacturaEnSheet(datosFactura);

      // Confirmar al usuario
      await whatsappService.sendMessage(userId, "✅ ¡Gracias! Tu factura será enviada en un plazo máximo de 48 horas hábiles.");
      await this.sendWelcomeMenu(userId);
      await stateStore.set(userId, {
        estado: 'inicio', subestado: 'menu_principal', ultimaActualizacion: Date.now()
      });

    }
  }

}
// Revisa si un estado de conversación está dentro de un rango de validez temporal (24 horas).
// Ayuda a decidir si el bot debe continuar un flujo anterior o iniciar uno nuevo.
function esEstadoVigente(estado) {
  if (!estado?.ultimaActualizacion) return false;
  const ahora = Date.now();
  const hace24h = 24 * 60 * 60 * 1000;
  return (ahora - estado.ultimaActualizacion) <= hace24h;
}



export default new MessageHandler();

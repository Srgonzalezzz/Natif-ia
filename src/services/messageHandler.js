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
import { generarLinkCarritoMultiple } from './shopifyCartLink.js';
import { limitarTitulo } from '../utils/whatsappUtils.js';
import flujosConversacionales from '../../data/flows.js'; // ✅ ESTE ES EL IMPORT QUE FALTABA

class MessageHandler {
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

  async cerrarChat(userId) {
    await this.clearUserTimers(userId);
    await whatsappService.sendMessage(userId, "¡Gracias a ti! Finalicé el chat 😊 Si necesitas más ayuda, solo saluda en nuestro chat.");
    await stateStore.delete(userId);
  }

  async handleTextMessage(text, userId, senderInfo) {
    const incomingMessage = text.toLowerCase().trim();

    if (closingExpressions.some(exp => incomingMessage.includes(exp))) {
      return await this.cerrarChat(userId);
    }

    if (greetings.some(greet => incomingMessage.includes(greet))) {
      await this.sendWelcomeMessage(userId, senderInfo);
      await this.sendWelcomeMenu(userId);
      return;
    }

    const estado = await stateStore.get(userId) || { step: 'esperando_interaccion' };

    switch (estado.step) {
      case 'esperando_guia':
        await this.handleTrackingQuery(incomingMessage, userId);
        break;
      case 'esperando_interaccion':
        await whatsappService.sendMessage(userId, "¿Aún necesitas ayuda? Aquí tienes nuevamente el menú 😊");
        await this.sendWelcomeMenu(userId);
        break;
      case 'question':
      case 'consultando_pedido':
        await this.handleAssistantFlow(userId, incomingMessage, senderInfo);
        break;
      default:
        const intencion = detectarIntencion(incomingMessage);
        if (intencion === 'consulta_pedido') {
          return await this.handleMenuOption(userId, 'consultar pedido');
        }
        await this.sendWelcomeMessage(userId, senderInfo);
        await this.sendWelcomeMenu(userId);
        await stateStore.set(userId, { step: 'esperando_interaccion' });
    }
  }

  async handleTrackingQuery(trackingRaw, userId) {
    const trackingNumber = trackingRaw.replace(/\s/g, '').toUpperCase();
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

    await stateStore.set(userId, { step: 'esperando_interaccion' });
    setTimeout(async () => {
      await whatsappService.sendMessage(userId, "¿Deseas hacer otra consulta o recibir más ayuda? Aquí tienes el menú nuevamente:");
      await this.sendWelcomeMenu(userId);
    }, 1500);
  }

  async handleInteractiveMessage(message) {
    const userId = message.from;
    const option = message.interactive?.button_reply?.title.toLowerCase().trim();
    const estado = await stateStore.get(userId);

    if (estado?.flujo_actual) {
      const flujo = estado.flujo_actual;

      // Flujo: pedido_mal → encadena a flujo devolucion con botones
      if (flujo.intencion === 'pedido_mal') {
        if (
          option.includes('dañado') ||
          option.includes('incompleto') ||
          option.includes('equivocado')
        ) {
          const siguienteFlujo = Object.values(flujosConversacionales).find(f => f.intencion === 'devolucion');
          if (siguienteFlujo) {
            // Guardamos el nuevo flujo como activo
            await stateStore.set(userId, {
              step: siguienteFlujo.step,
              flujo_actual: siguienteFlujo
            });

            // Enviamos la pregunta del flujo de devolución
            await whatsappService.sendMessage(userId, `🔁 *${siguienteFlujo.nombre}*`);
            await whatsappService.sendMessage(userId, siguienteFlujo.pregunta);

            // Enviamos botones "Sí" / "No"
            await whatsappService.sendInteractiveButtons(userId, "Elige una opción:", [
              {
                type: 'reply',
                reply: { id: 'devolucion_si', title: 'Sí' }
              },
              {
                type: 'reply',
                reply: { id: 'devolucion_no', title: 'No' }
              }
            ]);

            return;
          }
        } else {
          await whatsappService.sendMessage(userId, "Gracias por tu respuesta. Será revisada por nuestro equipo.");
          await stateStore.set(userId, { step: 'esperando_interaccion' });
          await this.sendWelcomeMenu(userId);
          return;
        }
      }
      if (flujo.intencion === 'devolucion') {
        if (option.includes('devolucion_si')) {
          await whatsappService.sendMessage(userId, flujo.respuesta_no, "Gracias por tu honestidad. Lamentablemente, no podemos recibir productos que ya fueron abiertos por razones sanitarias 🧪. Si tienes dudas adicionales, puedes escribirnos.");
        } else if (option.includes('devolucion_no')) {
          await whatsappService.sendMessage(userId, flujo.respuesta_si, "Perfecto. Podemos programar una recogida del producto 📦. Por favor, indícanos tu dirección y disponibilidad para coordinarlo.");
        } else {

          await whatsappService.sendMessage(userId, "Gracias por tu respuesta. ¿Podrías confirmar si el producto fue abierto? 🙏");
        }

        await stateStore.set(userId, { step: 'esperando_interaccion' });
        await this.sendWelcomeMenu(userId);
        return;
      }


    }

    if (estado?.step === 'seleccionando_producto') {
      const optionId = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id;
      const optionTitle = message.interactive?.button_reply?.title?.toLowerCase().trim() ||
        message.interactive?.list_reply?.title?.toLowerCase().trim();

      // Acción especial: seguir comprando
      if (optionId === 'seguir_comprando') {
        await whatsappService.sendListMessage(userId, {
          header: "🛒 Productos disponibles",
          body: "Selecciona un producto para agregarlo al carrito.",
          footer: "Puedes agregar varios productos antes de pagar, recuerda que viene x12 Unidades.",
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
        return;
      }

      // Acción especial: ver carrito
      if (optionId === 'ver_carrito') {
        if (!estado?.carrito || estado.carrito.length === 0) {
          await whatsappService.sendMessage(userId, "Tu carrito está vacío 🛒");
          return;
        }

        const resumen = estado.carrito.map((item, i) =>
          `*${i + 1}.* ${item.nombre} (x${item.cantidad})`
        ).join('\n');

        function generarBotonesUnicos(carrito) {
          const usados = new Set();
          return carrito.map((item, i) => {
            let base = `Quitar ${item.nombre}`.trim();
            let titulo = base.slice(0, 20);

            // Evita títulos duplicados
            let count = 1;
            while (usados.has(titulo)) {
              const suffix = ` ${count++}`;
              titulo = `${base.slice(0, 20 - suffix.length)}${suffix}`;
            }
            usados.add(titulo);

            return {
              type: 'reply',
              reply: {
                id: `eliminar_${i}`,
                title: titulo
              }
            };
          });
        }


        const botonesEliminar = generarBotonesUnicos(estado.carrito);


        await whatsappService.sendMessage(userId, `🧾 Aquí está tu carrito:\n${resumen}`);
        const carrito = estado.carrito || [];

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

        return;
      }

      // Eliminar producto del carrito
      if (optionId?.startsWith('eliminar_')) {
        const index = Number(optionId.split('_')[1]);
        let carrito = estado.carrito || [];

        if (!isNaN(index) && carrito[index]) {
          const eliminado = carrito.splice(index, 1)[0];
          await whatsappService.sendMessage(userId, `🗑️ Producto eliminado: *${eliminado.nombre}*`);
          await stateStore.set(userId, { ...estado, step: 'seleccionando_producto', carrito }); // <- Persistencia real aquí
        } else {
          await whatsappService.sendMessage(userId, "No pude identificar el producto a eliminar. Intenta nuevamente.");
        }

        // Reconsultamos el estado actualizado
        const nuevoEstado = await stateStore.get(userId);
        const nuevoCarrito = nuevoEstado.carrito || [];

        if (nuevoCarrito.length === 0) {
          await whatsappService.sendMessage(userId, "Tu carrito ahora está vacío 🛒");
          return await this.sendPostCarritoOptions(userId);
        }

        const resumen = nuevoCarrito.map((item, i) =>
          `*${i + 1}.* ${item.nombre} (x${item.cantidad})`
        ).join('\n');

        await whatsappService.sendMessage(userId, `🧾 Carrito actualizado:\n${resumen}`);
        return await this.sendPostCarritoOptions(userId);
      }


      // Finalizar compra
      if (optionId === 'finalizar_compra') {
        const carrito = estado?.carrito || [];

        if (carrito.length === 0) {
          await whatsappService.sendMessage(userId, "Tu carrito está vacío 🛒");
          return;
        }

        const resumen = carrito.map((item, i) =>
          `*${i + 1}.* ${item.nombre} (x${item.cantidad})`
        ).join('\n');

        await whatsappService.sendMessage(userId, `🧾 Tu carrito:\n${resumen}`);
        const link = generarLinkCarritoMultiple(carrito);
        await whatsappService.sendMessage(userId, `🛒 ¡Listo! Aquí tienes tu link para finalizar la compra:\n${link}`);


        await this.sendWelcomeMenu(userId);
        await stateStore.set(userId, { step: 'esperando_interaccion' });
        return;
      }

      // Si eligió un producto del catálogo
      const productoElegido = productos.find(p =>
        p.id === optionId || p.nombre.toLowerCase().trim() === optionTitle
      );

      if (!productoElegido) {
        await whatsappService.sendMessage(userId, "Producto no reconocido. Intenta nuevamente.");
        return;
      }

      const carrito = estado.carrito || [];
      carrito.push({ variantId: productoElegido.variantId, nombre: productoElegido.nombre, cantidad: 1 });

      await stateStore.set(userId, { step: 'seleccionando_producto', carrito });

      const resumen = carrito.map((item, i) =>
        `*${i + 1}.* ${item.nombre} (x${item.cantidad})`
      ).join('\n');

      await whatsappService.sendMessage(userId, `🧾 Productos en tu carrito:\n${resumen}`);

      await whatsappService.sendInteractiveButtons(userId, "¿Qué deseas hacer ahora?", [
        { type: 'reply', reply: { id: 'seguir_comprando', title: "AGREGAR PRODUCTO" } },
        { type: 'reply', reply: { id: 'ver_carrito', title: "VER CARRITO" } },
        { type: 'reply', reply: { id: 'finalizar_compra', title: "LINK DE PAGO" } }
      ]);
      return;
    }

    if (["si, gracias", "otra pregunta", "hablar con soporte"].includes(option)) {
      await this.handleFeedbackButtons(userId, option);
    } else {
      await this.handleMenuOption(userId, option);
    }
  }

  async sendPostCarritoOptions(userId) {
    await whatsappService.sendInteractiveButtons(userId, "¿Qué deseas hacer ahora?", [
      { type: 'reply', reply: { id: 'seguir_comprando', title: "AGREGAR PRODUCTO" } },
      { type: 'reply', reply: { id: 'ver_carrito', title: "VER CARRITO" } },
      { type: 'reply', reply: { id: 'finalizar_compra', title: "FINALIZAR COMPRA" } }
    ]);
  }

  async handleMenuOption(userId, option) {
    const lowerOpt = option.toLowerCase();
    let response = '';

    if (lowerOpt.includes('consultar')) {
      await stateStore.set(userId, { step: 'esperando_guia' });
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
      await stateStore.set(userId, { step: 'seleccionando_producto', carrito: [] });




    } else if (lowerOpt.includes('ia natif')) {
      await stateStore.set(userId, { step: 'question' });
      this.setInactivityTimers(userId);
      response = 'Genial! Soy la IA NATIF y estoy aquí para ayudarte 🤖';
    } else {
      response = 'Lo siento, tu mensaje no fue claro';
    }

    await whatsappService.sendMessage(userId, response);
  }

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
      if (flujo) {
        await this.ejecutarFlujoConversacional(userId, flujo);
        return;
      }


      const respuestaLocal = await buscarEnDocumentoLocal(message);
      const respuesta = respuestaLocal
        ? formatearPorClave(intencion, Array.isArray(respuestaLocal) ? respuestaLocal.map(x => x.texto).join('\n') : respuestaLocal)
        : formatearRespuesta(await GeminiService(userId, message));

      await whatsappService.sendMessage(userId, respuesta);

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
      await whatsappService.sendMessage(userId, "Lo siento, hubo un error procesando tu solicitud.");
    }
  }

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
      step: flujo.step,
      flujo_actual: flujo
    });
  }

  async redirigirASoporte(userId, mensaje, senderInfo) {
    const numeroSupervisor = '573006888304'; // Número de asesor que recibirá el reclamo
    const nombreCliente = senderInfo?.profile?.name || 'Cliente sin nombre';

    // Datos para plantilla de WhatsApp
    const plantilla = {
      name: 'reclamo_detectado',       // Debes tener esta plantilla aprobada en WhatsApp Business
      languageCode: 'es',
      parameters: [
        { type: 'text', text: nombreCliente }, // {{1}} Nombre
        { type: 'text', text: mensaje },       // {{2}} Reclamo
        { type: 'text', text: userId }         // {{3}} WhatsApp del cliente
      ]
    };

    try {
      await whatsappService.sendTemplateMessage(
        numeroSupervisor,
        plantilla.name,
        plantilla.languageCode,
        [
          {
            type: 'body',
            parameters: plantilla.parameters
          }
        ]
      );

      if (estado?.flujo_actual) {
        const flujo = estado.flujo_actual;

        if (flujo.intencion === 'devolucion') {
          if (option === 'sí') {
            await whatsappService.sendMessage(userId, flujo.respuesta_si);
          } else if (option === 'no') {
            await whatsappService.sendMessage(userId, flujo.respuesta_no);
          }
          await stateStore.set(userId, { step: 'esperando_interaccion' });
          await this.sendWelcomeMenu(userId);
          return;
        }
      }
      await whatsappService.sendMessage(userId, "✅ Hemos recibido tu mensaje. Un asesor de NATIF se comunicará contigo muy pronto 🙏");
      await stateStore.delete(userId);
    } catch (error) {
      console.error("❌ Error notificando al asesor humano:", error.response?.data || error.message);
      await whatsappService.sendMessage(userId, "Hubo un error al contactar al equipo de soporte 😔. Intenta de nuevo más tarde.");
    }
  }


  async clearUserTimers(userId) {
    const state = await stateStore.get(userId);
    if (state?.timeout) clearTimeout(state.timeout);
    if (state?.finalClosureTimeout) clearTimeout(state.finalClosureTimeout);
  }

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

        await stateStore.set(userId, { ...state, finalClosureTimeout });
      }, warningDelay);

      await stateStore.set(userId, { ...(currentState || {}), timeout });
    };

    run();
  }

  async handleFeedbackButtons(userId, option) {
    switch (option) {
      case 'si, gracias':
        await this.cerrarChat(userId);
        break;
      case 'otra pregunta':
        await whatsappService.sendMessage(userId, '¡Perfecto! Puedes escribirme tu siguiente inquietud.');
        await stateStore.set(userId, { step: 'question' });
        break;
      case 'hablar con soporte':
        await whatsappService.sendMessage(userId, 'Conectándote con nuestro equipo de soporte humano… Un momento por favor 👩‍💻');
        const numeroSoporte = '573006888304';
        await whatsappService.sendMessage(numeroSoporte, `📞 El cliente ${userId} solicitó soporte humano.`);
        await stateStore.delete(userId);
        break;
    }
  }

  async sendWelcomeMessage(to, senderInfo) {
    const name = senderInfo?.profile?.name || senderInfo?.wa_id || "Cliente";
    await whatsappService.sendMessage(to, `Hola ${name}, soy la IA NATIF, estoy aquí para brindarte soluciones :3`);
  }

  async sendWelcomeMenu(to) {
    const buttons = [
      { type: 'reply', reply: { id: 'opcion_1', title: 'CONSULTAR PEDIDO' } },
      { type: 'reply', reply: { id: 'opcion_2', title: 'COMPRAR PRODUCTO' } },
      { type: 'reply', reply: { id: 'opcion_3', title: 'IA NATIF' } }
    ];
    await whatsappService.sendInteractiveButtons(to, "¿Cómo puedo ayudarte el día de hoy?", buttons);
  }


}


export default new MessageHandler();

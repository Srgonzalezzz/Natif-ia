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
import flujos from '../../data/flows.js'; // Ajusta la ruta según corresponda


class MessageHandler {
  // INTERPRETACION DE MENSAJE 
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
  // CIERRE DE CHAT
  async cerrarChat(userId) {
    await this.clearUserTimers(userId);
    await whatsappService.sendMessage(userId, "✨ ¡Gracias por confiar en nosotros! Si vuelves a necesitar ayuda, solo escríbeme por este mismo chat 💬. ¡Que tengas un excelente día! 🙌");
    await stateStore.delete(userId);
  }
  // ACCION DE INTERACION DE MENU Y MAS
  async handleTextMessage(text, userId, senderInfo) {
    const incomingMessage = text.toLowerCase().trim();

    const estado = await stateStore.get(userId) || { estado: 'inicio', subestado: 'menu_principal' };
    const historial = estado?.historial || [];

    historial.push({ tipo: 'usuario', texto: incomingMessage, timestamp: new Date().toISOString() });
    await stateStore.set(userId, { ...estado, historial });

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
        if (estado.subestado === 'confirmando_pedido') {
          if (incomingMessage.includes('sí')) {
            const nuevoEstado = {
              estado: 'factura',
              subestado: 'recolectando_datos',
              pedido: estado.pedido,
              datos_requeridos: [
                "Nombre / Razón social",
                "NIT o Cédula",
                "Dirección",
                "Ciudad",
                "Correo"
              ],
              datos_recibidos: [],
              pedido_info: estado.pedido_info
            };
            await stateStore.set(userId, nuevoEstado);
            await whatsappService.sendMessage(userId, "✅ Perfecto, continuemos con los datos para tu factura.");
            await whatsappService.sendMessage(userId, `Por favor indícame el siguiente dato:\n*${nuevoEstado.datos_requeridos[0]}*`);
          } else if (incomingMessage.includes('no')) {
            await whatsappService.sendMessage(userId, "🔁 Entendido. Por favor vuelve a escribir el número de pedido correcto (ej: *#3037*).");
            await stateStore.set(userId, {
              estado: 'factura',
              subestado: 'esperando_pedido'
            });
          } else {
            await whatsappService.sendMessage(userId, "¿Podrías confirmar si el pedido mostrado es correcto? Responde *sí* o *no*.");
          }

          return;
        }

        if (estado.subestado === 'recolectando_datos') {
          const { datos_requeridos, datos_recibidos, pedido } = estado;
          const siguienteDato = datos_requeridos[datos_recibidos.length];
          datos_recibidos.push({ campo: siguienteDato, valor: incomingMessage });

          if (datos_recibidos.length === datos_requeridos.length) {
            const correo = datos_recibidos.find(d => d.campo.toLowerCase().includes('correo'))?.valor;
            await whatsappService.sendMessage(userId, "✅ Gracias. Hemos recibido todos tus datos.");
            await whatsappService.sendMessage(userId, `📨 Tu factura será enviada en un plazo de *24 horas* al correo indicado: *${correo || 'no especificado'}*`);
            await this.sendWelcomeMenu(userId);
            await stateStore.set(userId, { estado: 'inicio', subestado: 'menu_principal' });
          } else {
            const siguiente = datos_requeridos[datos_recibidos.length];
            await stateStore.set(userId, {
              ...estado,
              datos_recibidos
            });
            await whatsappService.sendMessage(userId, `Por favor indícame:\n*${siguiente}*`);
          }
          return;
        }
        break;


      default: {
        const intencion = detectarIntencion(incomingMessage);

        const flujo = Object.values(flujosConversacionales).find(f => f.intencion === intencion);
        if (flujo) {
          await this.ejecutarFlujoConversacional(userId, flujo);
          return;
        }

        await this.sendWelcomeMessage(userId, senderInfo);
        await this.sendWelcomeMenu(userId);
        await stateStore.set(userId, { estado: 'inicio', subestado: 'menu_principal' });
      }
    }
  }
  // CONSULTA DE PEDIDO
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

    await stateStore.set(userId, { step: 'esperando_interaccion' });
    setTimeout(async () => {
      await whatsappService.sendMessage(userId, "¿Deseas hacer otra consulta o recibir más ayuda? Aquí tienes el menú nuevamente:");
      await this.sendWelcomeMenu(userId);
    }, 1500);
  }
  // INTERACCIONES DE FLUJO
  // async handleInteractiveMessage(message) {
  //   const userId = message.from;
  //   const option = message.interactive?.button_reply?.title.toLowerCase().trim();
  //   const estado = await stateStore.get(userId);

  //   // Si no está en flujo, comportamiento por defecto o menú
  //   if (["si, gracias", "otra pregunta", "hablar con soporte"].includes(option)) {
  //     await this.handleFeedbackButtons(userId, option);
  //   } else {
  //     await this.handleMenuOption(userId, option);
  //   }
  // }
  async handleInteractiveMessage(message) {
    const userId = message.from;
    const option = message.interactive?.button_reply?.title.toLowerCase().trim();
    const estado = await stateStore.get(userId);

    if (estado?.estado === 'flujo') {
      const flujo = estado.flujo_actual;
      const respuesta = option;

      switch (estado.subestado) {
        case 'reporte_pedido_mal': {
          const respuesta = option.toLowerCase();

          if (respuesta.includes('equivocado') || respuesta.includes('incompleto')) {
            await whatsappService.sendMessage(userId, "Por favor, indícanos tu número de pedido para ayudarte (ejemplo: *#1234*).");
            await stateStore.set(userId, {
              estado: 'esperando_numero_orden',
              motivo: respuesta,
              flujo_origen: 'pedido_mal'
            });
            return;
          }

          // Producto dañado u otro
          const siguiente = Object.values(flujos).find(f => f.intencion === 'devolucion');
          if (siguiente) {
            const botones = siguiente.opciones.map((title, i) => ({
              type: "reply",
              reply: { id: `btn_${i}`, title }
            }));
            await stateStore.set(userId, {
              estado: 'flujo',
              flujo_actual: siguiente,
              subestado: siguiente.step
            });
            await whatsappService.sendInteractiveButtons(userId, siguiente.pregunta, botones);
          } else {
            await whatsappService.sendMessage(userId, "Gracias por tu mensaje. Lo revisaremos.");
          }
          return;
        }



        case 'cambio_devolucion': {
          if (respuesta === 'sí' || respuesta === 'si') {
            await whatsappService.sendMessage(userId, flujo.respuesta_si);
          } else if (respuesta === 'no') {
            await whatsappService.sendMessage(userId, flujo.respuesta_no);
          } else {
            await whatsappService.sendMessage(userId, "¿Podrías confirmar si el producto fue abierto?");
          }
          break;
        }

        case 'factura_electronica': {
          await whatsappService.sendMessage(userId, flujo.respuesta_final);
          await whatsappService.sendMessage(userId, "Por favor, indícanos tu número de pedido para generar la factura (ejemplo: *#1234*).");
          await stateStore.set(userId, { estado: 'factura', subestado: 'esperando_pedido' });
          return;
        }

        case 'resenas': {
          if (respuesta.includes('pública')) {
            await whatsappService.sendMessage(userId, flujo.respuesta_publica);
          } else if (respuesta.includes('privado')) {
            await whatsappService.sendMessage(userId, flujo.respuesta_privada);
          } else {
            await whatsappService.sendMessage(userId, flujo.respuesta_publica);
            await whatsappService.sendMessage(userId, flujo.respuesta_privada);
          }
          break;
        }

        case 'alianzas': {
          await whatsappService.sendMessage(userId, flujo.respuesta_final);
          break;
        }

        default:
          await whatsappService.sendMessage(userId, "Gracias por tu respuesta. Pronto te ayudaremos.");
      }

      // Reset
      await stateStore.set(userId, { estado: 'inicio', subestado: 'menu_principal' });
      await this.sendWelcomeMenu(userId);
      return;
    }

    // Si no está en un flujo
    await this.handleMenuOption(userId, option);
  }

  // OPCIONES DEL CARRITO
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
      await stateStore.set(userId, { estado: 'seguimiento', subestado: 'esperando_guia' });
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
      await stateStore.set(userId, { estado: 'carrito', subestado: 'seleccionando_producto', carrito: [] });


    } else if (lowerOpt.includes('ia natif')) {
      await stateStore.set(userId, { estado: 'ia', subestado: 'esperando_pregunta' });
      this.setInactivityTimers(userId);
      response = 'Genial! Soy la IA NATIF y estoy aquí para ayudarte 🤖';
    } else {
      response = 'Lo siento, tu mensaje no fue claro';
    }

    await whatsappService.sendMessage(userId, response);
  }
  // CONSULTA LOCAL O IA
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

      const actualizado = await stateStore.get(userId);
      const historial = actualizado?.historial || [];
      historial.push({ tipo: 'bot', texto: respuesta, timestamp: new Date().toISOString() });

      await stateStore.set(userId, { ...actualizado, historial });


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
  // POR DEFINIR 
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
      flujo_actual: flujo
    });
  }
  // MENSAJE HACIA SOPORTE HUMANO
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

        await stateStore.set(userId, { ...state, finalClosureTimeout });
      }, warningDelay);

      await stateStore.set(userId, { ...(currentState || {}), timeout });
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
        await stateStore.set(userId, { estado: 'ia', subestado: 'esperando_pregunta' });
        break;
      case 'hablar con soporte':
        await whatsappService.sendMessage(userId, 'Conectándote con nuestro equipo de soporte humano… Un momento por favor 👩‍💻');
        const numeroSoporte = '573006888304';
        await whatsappService.sendMessage(numeroSoporte, `📞 El cliente ${userId} solicitó soporte humano.`);
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
    await whatsappService.sendInteractiveButtons(to, "¿Cómo puedo ayudarte el día de hoy?", buttons);
  }

}


export default new MessageHandler();

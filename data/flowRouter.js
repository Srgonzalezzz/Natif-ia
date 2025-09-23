import { puntosVentaPorCiudad } from "../data/puntosVentaPorCiudad.js";
import stateStore from '../src/services/stateStore.js';
import facturaHandler from '../src/services/handlers/facturaHandler.js';

const normalizar = (str) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9 ]/gi, "")     // deja solo letras/números
    .replace(/\b(el|la|los|las)\b/g, "") // limpia artículos
    .trim();

const flowRouter = {

  // 👇 Flujo de facturación: mapeamos por step
  factura_electronica: facturaHandler,
  esperando_datos_factura: facturaHandler,

  // Preguntas frecuentes de compra
  faq_compra: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "metodos de pago": "🏦 Puedes pagar por Bancolombia, Nequi, tarjeta o contraentrega.",
      "tiempos de entrega": "🚚 Entregamos entre *5 a 7 días hábiles*.",
      "costo de envio": "📦 El costo de envío depende de tu ciudad.",
      "envios a todo el pais": "📍 Sí, hacemos envíos a toda Colombia 🇨🇴",
      "promociones activas": "🎉 Consulta nuestras promos en https://natif.com/promos"
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  // Pedido mal
  reporte_pedido_mal: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "producto equivocado": "📦 Parece que recibiste un producto diferente al que pediste. Por favor compártenos una foto del producto recibido.",
      "producto dañado": "😞 Lamentamos que tu pedido haya llegado dañado. Envíanos una foto del producto y del empaque exterior para darte una solución rápida.",
      "producto incompleto": "📦 Si faltó algo en tu pedido, cuéntanos qué fue exactamente y lo solucionaremos lo antes posible."
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
    await whatsappService.sendMessage(userId, respuesta);

    if (key === "producto equivocado") {
      await stateStore.set(userId, { estado: "reporte_pedido", subestado: "esperando_foto_equivocado" });
    }
    if (key === "producto dañado") {
      await stateStore.set(userId, { estado: "reporte_pedido", subestado: "esperando_foto_danado" });
    }
    if (key === "producto incompleto") {
      await stateStore.set(userId, { estado: "reporte_pedido", subestado: "esperando_texto_incompleto" });
    }


  },

  // Devoluciones
  // cambio_devolucion: async (userId, opcion, whatsappService) => {
  // const respuestas = {
  // "si": "📬 Perfecto, podemos gestionar tu devolución. ¿Prefieres que lo recojamos en tu domicilio o enviarlo tú mismo?",
  // "no": "🚫 Lo sentimos, por normas sanitarias no podemos aceptar devoluciones de productos abiertos."
  // };

  // const key = normalizar(opcion);
  // const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
  // await whatsappService.sendMessage(userId, respuesta);
  // return { tipo: "texto", contenido: respuesta };
  // },

  // Ingredientes
  ingredientes: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "que es la alulosa": "🍬 La alulosa es un endulzante natural, bajo en calorías y apto para diabéticos.",
      "es sin azucar": "✅ Sí, nuestros productos son 100% sin azúcar añadida.",
      "tiene gluten o lactosa": "🚫 Nuestros productos no contienen gluten ni lactosa.",
      "apto para diabeticos": "🩺 Sí, están diseñados especialmente para personas con diabetes y estilos de vida saludables."
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  // Compra
  // interes_compra: async (userId, opcion, whatsappService) => {
  // const respuestas = {
  // "colombia": "🇨🇴 Elige una forma de compra:\n\n1️⃣ Comprar online\n2️⃣ Ver puntos de venta\n3️⃣ Compra al por mayor",
  // "otro pais": "🌎 Genial. ¿En qué país estás?\n¿Eres cliente final o distribuidor?\nY cuéntanos qué productos te interesan."
  // };

  // const key = normalizar(opcion);
  // const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
  // await whatsappService.sendMessage(userId, respuesta);
  // return { tipo: "texto", contenido: respuesta };
  // },

  // Reseñas
  resenas: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "resena publica": "📝 Puedes dejar tu reseña en este enlace: https://natif.com/resenas",
      "comentario privado": "🗣️ Cuéntanos cómo fue tu experiencia. Nos interesa mucho tu opinión para mejorar 💬",
      "ambas": "🙌 Perfecto. Puedes dejar tu reseña pública aquí: https://natif.com/resenas y también contarnos tu experiencia por este medio."
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  // Alianzas
  alianzas: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "influencer": "📲 ¡Genial! Por favor cuéntanos:\n- Red social\n- Ciudad\n- Tipo de contenido\n- Número de seguidores",
      "distribuidor": "🏪 Gracias por tu interés. Por favor indícanos:\n- Nombre del negocio\n- Ciudad\n- Tipo de punto de venta\n- Email de contacto",
      "otra alianza": "🤝 ¡Excelente! Cuéntanos qué tipo de colaboración te gustaría proponer."
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  // Puntos de venta
  puntos_venta: async (userId, opcion, whatsappService) => {
    const ciudad = normalizar(opcion); // normalizamos lo que el usuario escribió
    const puntos = puntosVentaPorCiudad[ciudad];
    let mensaje;

    if (puntos && puntos.length > 0) {
      mensaje = `📍 Puntos de venta en *${ciudad}*:\n\n${puntos
        .map((p, i) => `${i + 1}. ${p}`)
        .join("\n")}`;
    } else {
      mensaje = `❌ Lo siento, no encontré puntos de venta en *${ciudad}*.`;
    }

    await whatsappService.sendMessage(userId, mensaje);
    return { tipo: "texto", contenido: mensaje };
  }

};

export default flowRouter;

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

  kinops: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "ingredientes": "5 ingredientes, endulzados con stevia y eritritol, sin azúcar añadida, libres de gluten, producto vegano, vida útil de 2 años, 30 g por empaque",
      "quiero comprar": "Puedes comprar en nuestra tienda online https://www.natifbyissavasquez.com/collections/kinops"
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  gummis: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "ingredientes": "Sabores y colores 100 % naturales, endulzadas con alulosa y eritritol, bajo índice glucémico (apto para diabéticos), libres de gluten, sin colorantes ni saborizantes artificiales, vida útil de ~1 año, 50 g por empaque. Nota: Están en proceso de cambio a presentación de 35 g",
      "quiero comprar": "Puedes comprar en nuestra tienda online https://www.natifbyissavasquez.com/collections/gummis"
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  chocotabs: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "ingredientes": "Sabores y colores 100 % naturales, endulzadas con alulosa y eritritol, bajo índice glucémico (apto para diabéticos), libres de gluten, sin colorantes ni saborizantes artificiales, vida útil de ~1 año, 50 g por empaque. Nota: Están en proceso de cambio a presentación de 35 g",
      "quiero comprar": "Puedes comprar en nuestra tienda online https://www.natifbyissavasquez.com/collections/gummis"
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

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
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
    await whatsappService.sendMessage(userId, respuesta);

    // ✅ Guardar estado para esperar la próxima interacción
    const { setEstado } = await import('../utils/stateManager.js');
    await setEstado(userId, 'flujo', 'faq_compra', { ultimaPregunta: opcion });

    return { tipo: "texto", contenido: respuesta };
  },

  ingredientes: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "que es la alulosa": "🍬 La alulosa es un endulzante natural, bajo en calorías y apto para diabéticos.",
      "es sin azucar": "✅ Sí, nuestros productos son 100% sin azúcar añadida.",
      "tiene gluten o lactosa": "🚫 Nuestros productos no contienen gluten ni lactosa.",
      "apto para diabeticos": "🩺 Sí, están diseñados especialmente para personas con diabetes y estilos de vida saludables."
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
    await whatsappService.sendMessage(userId, respuesta);
    return { tipo: "texto", contenido: respuesta };
  },

  resenas: async (userId, opcion, whatsappService) => {
    const respuestas = {
      "resena publica": "📝 Puedes dejar tu reseña en este enlace: https://natif.com/resenas",
      "comentario privado": "🗣️ Cuéntanos cómo fue tu experiencia. Nos interesa mucho tu opinión para mejorar 💬",
      "ambas": "🙌 Perfecto. Puedes dejar tu reseña pública aquí: https://natif.com/resenas y también contarnos tu experiencia por este medio."
    };

    const key = normalizar(opcion);
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
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
    const respuesta = respuestas[key] || "Lo siento, no entiendo tu pregunta. Vuelve a intentarlo.";
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

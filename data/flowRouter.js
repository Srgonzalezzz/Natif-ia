const normalizar = (str) =>
    str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // elimina tildes
        .replace(/[^a-z0-9 ]/gi, '')     // elimina signos excepto espacios
        .trim();

const flowRouter = {
    // FLUJO: PREGUNTAS FRECUENTES DE COMPRA
    faq_compra: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "métodos de pago": "🏦 Puedes pagar por Bancolombia, Nequi, tarjeta o contraentrega.",
            "tiempos de entrega": "🚚 Entregamos entre *5 a 7 días hábiles*.",
            "costo de envío": "📦 El costo de envío depende de tu ciudad.",
            "envíos a todo el país": "Sí, hacemos envíos a toda Colombia 🇨🇴",
            "promociones activas": "Consulta nuestras promos en https://natif.com/promos"
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: PEDIDO MAL (Producto equivocado, dañado, incompleto)
    reporte_pedido_mal: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "producto equivocado": "📦 Parece que recibiste un producto diferente. ¿Podrías compartirnos una foto del producto recibido para ayudarte más rápido?",
            "producto dañado": "😞 Lamentamos que haya llegado dañado. Por favor envíanos una foto del producto y el empaque exterior.",
            "producto incompleto": "📦 Si faltó algo en tu pedido, cuéntanos exactamente qué fue y lo solucionamos pronto."
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: DEVOLUCIÓN
    cambio_devolucion: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "sí": "📬 Puedes devolverlo sin problema. ¿Prefieres que lo recojamos o enviarlo tú mismo?",
            "no": "🚫 Lo sentimos, no podemos aceptar devoluciones de productos abiertos por normas sanitarias."
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: INGREDIENTES
    ingredientes: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "¿qué es la alulosa?": "🍬 La alulosa es un endulzante natural, bajo en calorías y apto para diabéticos.",
            "¿es sin azúcar?": "✅ Sí, nuestros productos son 100% sin azúcar añadida.",
            "¿tiene gluten o lactosa?": "🚫 Nuestros productos no contienen gluten ni lactosa.",
            "¿apto para diabéticos?": "🩺 Sí, están diseñados especialmente para personas con diabetes y estilos de vida saludables."
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: COMPRAR (desde el extranjero)
    interes_compra: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "colombia": "🇨🇴 ¿Cómo deseas comprar?\n\n1️⃣ Comprar online\n2️⃣ Ver puntos de venta\n3️⃣ Compra al por mayor",
            "otro país": "🌎 Genial. ¿En qué país estás?\n¿Eres cliente final o distribuidor?\nY por favor cuéntanos qué productos te interesan."
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: RESEÑAS Y OPINIONES
    resenas: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "reseña pública": "📝 Puedes dejar tu reseña en este enlace: https://natif.com/resenas",
            "comentario privado": "🗣️ Cuéntanos cómo fue tu experiencia. Nos interesa mucho tu opinión para mejorar 💬",
            "ambas": "Gracias 🙌 Puedes dejar tu reseña pública aquí: https://natif.com/resenas y también cuéntanos tu experiencia por este medio."
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: ALIANZAS, INFLUENCERS Y DISTRIBUIDORES
    alianzas: async (userId, opcion, whatsappService) => {
        const respuestas = {
            "influencer": "📲 ¡Genial! Por favor cuéntanos:\n- Red social\n- Ciudad\n- Tipo de contenido\n- Número de seguidores",
            "distribuidor": "🏪 Gracias por tu interés. Por favor indícanos:\n- Nombre del negocio\n- Ciudad\n- Tipo de punto de venta\n- Email de contacto",
            "otra alianza": "🤝 ¡Excelente! Cuéntanos qué tipo de colaboración te gustaría proponer."
        };

        const key = normalizar(opcion);
        const respuesta = respuestas[key] || "⚠️ No tengo una respuesta configurada para esa opción.";
        await whatsappService.sendMessage(userId, respuesta);
        return { tipo: 'texto', contenido: respuesta };
    },

    // FLUJO: PUNTOS DE VENTA
    puntos_venta: async (userId, opcion, whatsappService) => {
        const mensaje = obtenerMensajePuntosVenta(opcion);
        await whatsappService.sendMessage(userId, mensaje);
        return { tipo: 'texto', contenido: mensaje };
    }

};

export default flowRouter;

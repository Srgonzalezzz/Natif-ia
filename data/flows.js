const flujos = {
  flujo_2: {
    intencion: "pedido_mal",
    keywords: [
      "me llegó mal", "pedido dañado", "pedido equivocado", "pedido incompleto",
      "llegó mal", "mi pedido llego mal", "producto malo", "producto dañado",
      "producto incorrecto", "pedido mal", "producto roto", "me llegó dañado"
    ],
    nombre: "Me llegó mal el pedido",
    step: "reporte_pedido_mal",
    pregunta: "Lamentamos lo ocurrido. ¿Qué ocurrió exactamente?",
    opciones: ["Producto equivocado", "Producto dañado", "Producto incompleto"],
    respuesta_equivocado: ["prueba"],
    respuesta_dañado: ["prueba 2"],
    respuesta_incompleto: ["prueba 3"]
  },
  flujo_3: {
    intencion: "devolucion",
    keywords: ["cambiar producto", "devolver", "devolución", "cambio de producto"],
    nombre: "Cambios y devoluciones",
    step: "cambio_devolucion",
    pregunta: "¿El producto está sin abrir?",
    opciones: ["Sí", "No"],
    respuesta_si: "Puedes devolverlo. ¿Quieres que lo recojamos o prefieres enviarlo tú?",
    respuesta_no: "No podemos aceptar devoluciones de productos abiertos por normas sanitarias."
  },
  flujo_4: {
    intencion: "factura",
    keywords: ["factura", "facturación", "comprobante", "factura electrónica"],
    nombre: "Solicitud de factura electrónica",
    step: "factura_electronica",
    pregunta: "Claro, indícanos tu número de pedido.",
    datos_requeridos: ["Nombre / Razón social", "NIT o Cédula", "Dirección", "Ciudad", "Correo"],
    respuesta_final: "Gracias. Tu factura será enviada en máximo 48 horas hábiles."
  },
  flujo_5: {
    intencion: "comprar",
    keywords: ["comprar", "precio", "cómo comprar", "dónde comprar"],
    nombre: "Estoy interesado en comprar",
    step: "interes_compra",
    pregunta: "¿Desde dónde nos escribes?",
    opciones: ["Colombia", "Otro país"],
    respuesta_colombia: ["Comprar online", "Puntos de venta", "Compra al por mayor"],
    respuesta_exterior: ["¿En qué país estás?", "¿Eres cliente final o distribuidor?", "¿Qué productos te interesan?"]
  },
  flujo_6: {
    intencion: "factura_compra",
    keywords: ["métodos de pago", "tiempo de entrega", "envío", "promociones"],
    nombre: "Preguntas frecuentes de compra",
    step: "faq_compra",
    pregunta: "¿Qué deseas saber?",
    opciones: ["Métodos de pago", "Tiempos de entrega", "Costo de envío", "Envíos a todo el país", "Promociones activas"]
  },
  flujo_7: {
    intencion: "ingredientes",
    keywords: ["ingredientes", "alulosa", "sin azúcar", "diabéticos", "gluten", "lactosa"],
    nombre: "Ingredientes o propiedades del producto",
    step: "ingredientes_producto",
    pregunta: "¿Qué deseas saber?",
    opciones: ["¿Qué es la alulosa?", "¿Es sin azúcar?", "¿Tiene gluten o lactosa?", "¿Apto para diabéticos?"]
  },
  flujo_8: {
    intencion: "reclamo",
    keywords: ["queja", "reclamo", "sugerencia", "inconformidad"],
    nombre: "Quejas, reclamos y sugerencias",
    step: "quejas_reclamos",
    pregunta: "¿Quieres dejar una queja, reclamo o sugerencia?",
    opciones: ["Queja", "Reclamo", "Sugerencia"],
    respuesta_final: "Tu mensaje ha sido recibido y será atendido en máximo 48 horas hábiles."
  },
  flujo_9: {
    intencion: "resena",
    keywords: ["reseña", "calificación", "opinión", "experiencia"],
    nombre: "Reseñas y calificaciones",
    step: "resenas",
    pregunta: "¿Te gustaría dejar una reseña o compartir tu experiencia?",
    opciones: ["Reseña pública", "Comentario privado", "Ambas"],
    respuesta_publica: "Aquí puedes dejarla: [link]",
    respuesta_privada: "Cuéntanos cómo fue tu experiencia. Gracias por ayudarnos a mejorar."
  },
  flujo_10: {
    intencion: "alianza",
    keywords: ["influencer", "distribuidor", "colaboración", "alianza"],
    nombre: "Alianzas, influenciadores, distribuidores",
    step: "alianzas",
    pregunta: "¿Qué tipo de colaboración tienes en mente?",
    opciones: ["Influencer", "Distribuidor", "Otra alianza"],
    campos_influencer: ["Red social", "Ciudad", "Tipo de contenido", "Seguidores"],
    campos_distribuidor: ["Nombre del negocio", "Ciudad", "Tipo de punto de venta", "Email"],
    respuesta_final: "Gracias por tu interés. Tu propuesta será evaluada por nuestro equipo."
  }
};

export default flujos;

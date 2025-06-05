export function formatearRespuesta(texto) {
  if (typeof texto !== 'string') return '';

  return texto
    // Eliminar etiquetas HTML
    .replace(/<\/?[^>]+(>|$)/g, '')

    // Agrega saltos después de punto y antes de mayúsculas
    .replace(/([^.])\. ([A-ZÁÉÍÓÚ])/g, '$1.\n$2')

    // Títulos importantes con emojis
    .replace(/(PREGUNTAS FRECUENTES|POL[ÍI]TICAS DE ENV[ÍI]O|DEVOLUCI[ÓO]N|PUNTOS DE VENTA|NOSOTROS|PROP[ÓO]SITO)/gi, t => `\n\n*📌 ${t.trim().toUpperCase()}*`)

    // Resaltar tiendas
    .replace(/(Farmatodo|Tiendas [^\n]*)/g, t => `\n\n* ${t.trim()}*`)

    // Ciudades con guiones
    .replace(/(Medell[íi]n|Rionegro|Envigado|Bogot[áa]|Cali|Barranquilla|Bello|Sabaneta)/g, t => `- ${t.trim()}`)

    // Resaltar precios
    .replace(/\$[0-9.,]+/g, price => `💰 ${price}`)

    // URLs como imágenes
    .replace(/(https?:\/\/[^\s]+)/g, url => `\n📷 ${url}`)

    // Saltos antes de preguntas
    .replace(/¿/g, '\n\n¿')

    // Evitar saltos múltiples
    .replace(/\n{3,}/g, '\n\n')

    .trim();
}


export function formatearPorClave(clave, contenido) {
  // Validar contenido: si es array, convertir a string
  if (!contenido || typeof contenido !== 'string') {
    if (Array.isArray(contenido)) {
      contenido = contenido.map(s => s?.texto || '').join('\n');
    } else {
      contenido = String(contenido || '');
    }
  }

  switch (clave) {
    case 'puntos_de_venta':
      return '*📍 Puntos de Venta:*\n' +
        contenido
          .replace(/(Farmatodo|Tiendas [^\n]*)/g, '🏬 *$1*')
          .replace(/(Medell[íi]n|Rionegro|Envigado|Bello|Sabaneta)/g, '- $1');

    case 'quienes_somos':
      return '*🤝 Sobre Nosotros:*\n' + contenido;

    case 'faq':
      return '*❓ Preguntas Frecuentes:*\n' + contenido.replace(/¿/g, '\n\n¿');

    case 'politicas_de_envio':
    case 'devoluciones':
      return `*📦 ${clave.replace(/_/g, ' ').toUpperCase()}:*\n` + contenido;

    default:
      return contenido;
  }
}

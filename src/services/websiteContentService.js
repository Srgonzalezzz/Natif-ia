
import axios from 'axios';
import * as cheerio from 'cheerio';

const urls = [
  'https://www.natifbyissavasquez.com/',
  'https://www.natifbyissavasquez.com/pages/puntos-de-venta',
  'https://www.natifbyissavasquez.com/pages/quienes-somos',
  'https://www.natifbyissavasquez.com/pages/contact',
  'https://www.natifbyissavasquez.com/pages/quiero-ser-distribuidor',
  'https://www.natifbyissavasquez.com/pages/preguntas-frecuentes',
  'https://www.natifbyissavasquez.com/pages/terminos-y-condiciones',
  'https://www.natifbyissavasquez.com/pages/politicas-de-envio',
  'https://www.natifbyissavasquez.com/pages/politicas-de-devolucion-y-retracto',
  'https://www.natifbyissavasquez.com/pages/politica-de-tratamiento-de-datos',
  'https://www.natifbyissavasquez.com/pages/politicas-de-privacidad'
  // Agrega más URLs aquí según sea necesario
];


async function getWebsiteContent() {
  try {
    let combinedText = '';

    for (const url of urls) {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      let extracted = $('.product, .product-item, main, .container').text() || $('body').text();
      const cleanText = extracted.replace(/\s+/g, ' ').trim();
      combinedText += `Contenido de ${url}:\n${cleanText}\n\n`;
    }

    return combinedText;
  } catch (error) {
    console.error("Error al obtener contenido de uno o más sitios web:", error.message);
    throw new Error('No se pudo obtener el contenido del sitio.');
  }
}

export default getWebsiteContent;

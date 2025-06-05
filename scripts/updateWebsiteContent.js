import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

const urls = [
  { clave: 'kinops', url: 'https://www.natifbyissavasquez.com/' },
  { clave: 'puntos_de_venta', url: 'https://www.natifbyissavasquez.com/pages/puntos-de-venta' },
  { clave: 'quienes_somos', url: 'https://www.natifbyissavasquez.com/pages/quienes-somos' },
  { clave: 'contacto', url: 'https://www.natifbyissavasquez.com/pages/contact' },
  { clave: 'distribuidor', url: 'https://www.natifbyissavasquez.com/pages/quiero-ser-distribuidor' },
  { clave: 'faq', url: 'https://www.natifbyissavasquez.com/pages/preguntas-frecuentes' },
  { clave: 'terminos', url: 'https://www.natifbyissavasquez.com/pages/terminos-y-condiciones' },
  { clave: 'envios', url: 'https://www.natifbyissavasquez.com/pages/politicas-de-envio' },
  { clave: 'devoluciones', url: 'https://www.natifbyissavasquez.com/pages/politicas-de-devolucion-y-retracto' },
  { clave: 'tratamiento_datos', url: 'https://www.natifbyissavasquez.com/pages/politica-de-tratamiento-de-datos' },
  { clave: 'privacidad', url: 'https://www.natifbyissavasquez.com/pages/politicas-de-privacidad' }
];

async function getWebsiteContent() {
  const resultados = [];

  for (const item of urls) {
    try {
      const { data } = await axios.get(item.url);
      const $ = cheerio.load(data);
      const contenido = [];

      $('main, .container').find('h1, h2, h3, p, li').each((i, el) => {
        const tag = $(el).prop('tagName').toLowerCase();
        const text = $(el).text().replace(/\s+/g, ' ').trim();

        if (text) {
          contenido.push({ tipo: tag, texto: text });
        }
      });

      resultados.push({
        clave: item.clave,
        contenido
      });
    } catch (error) {
      console.error(`❌ Error en ${item.url}: ${error.message}`);
    }
  }

  return resultados;
}

async function actualizarNatifInfo() {
  const contentArray = await getWebsiteContent();
  fs.writeFileSync('./data/natifInfo.json', JSON.stringify(contentArray, null, 2), 'utf8');
  console.log('✅ Archivo natifInfo.json actualizado correctamente con contenido legible.');
}

actualizarNatifInfo();

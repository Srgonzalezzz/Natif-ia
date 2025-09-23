// src/services/shopifyOrders.js
import axios from 'axios';

const SHOPIFY_STORE = 'natifbyissavasquez';
const ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;

function getFechaHace8Dias() {
  const hoy = new Date();
  const hace8 = new Date(hoy.setDate(hoy.getDate() - 15));
  return hace8.toISOString();
}

/**
 * Buscar pedido por número de orden (#3030) o número de guía (03456173)
 * Solo revisa los últimos 8 días
 */
export async function buscarPedido(query) {
  try {
    const limpio = query.replace(/[^0-9]/g, ''); 
    const fechaFiltro = getFechaHace8Dias();

    // 1️⃣ Buscar por número de orden
    const urlOrden = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2025-07/orders.json?status=any&name=%23${limpio}&created_at_min=${fechaFiltro}`;

    const resOrden = await axios.get(urlOrden, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (resOrden.data.orders?.length) {
      const pedido = resOrden.data.orders[0];
      return {
        tipo: "orden",
        pedido: pedido.name,
        estado: pedido.fulfillment_status,
        tracking: pedido.fulfillments?.[0]?.tracking_number || '',
        empresa_envio: pedido.fulfillments?.[0]?.tracking_company || '',
        link: pedido.fulfillments?.[0]?.tracking_url || '',
        productos: pedido.line_items.map(p => p.title),
        cliente: `${pedido.customer?.first_name || ''} ${pedido.customer?.last_name || ''}`.trim(),
        correo: pedido.email,
        creado: pedido.created_at,
      };
    }

    // 2️⃣ Buscar por número de guía
    const urlGuia = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2025-07/orders.json?status=any&limit=250&created_at_min=${fechaFiltro}`;
    const resGuia = await axios.get(urlGuia, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    for (const pedido of resGuia.data.orders) {
      for (const f of pedido.fulfillments || []) {
        if (f.tracking_number === limpio) {
          return {
            tipo: "guia",
            pedido: pedido.name,
            estado: pedido.fulfillment_status,
            tracking: f.tracking_number,
            empresa_envio: f.tracking_company,
            link: f.tracking_url,
            productos: pedido.line_items.map(p => p.title),
            cliente: `${pedido.customer?.first_name || ''} ${pedido.customer?.last_name || ''}`.trim(),
            correo: pedido.email,
            creado: pedido.created_at,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error("❌ Error en búsqueda:", err.response?.data || err.message);
    return null;
  }
}

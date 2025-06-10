// src/services/shopifyService.js
import axios from 'axios';

const SHOPIFY_STORE = 'natifbyissavasquez';
const ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;

export async function buscarPedidoPorGuia(trackingNumber) {
  try {
    const res = await axios.get(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?status=any&limit=50`,
      {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const pedidos = res.data.orders;

    for (const pedido of pedidos) {
      for (const f of pedido.fulfillments || []) {
        if (f.tracking_number === trackingNumber) {
          return {
            pedido: pedido.name,
            estado: pedido.fulfillment_status,
            tracking: f.tracking_number,
            empresa_envio: f.tracking_company,
            link: f.tracking_url,
            productos: pedido.line_items.map(p => p.title),
            cliente: pedido.customer?.email || 'Sin correo',
            creado: pedido.created_at,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Error en Shopify:', err.response?.data || err.message);
    return null;
  }
}
export async function buscarPedidoPorNumero(numero) {
  try {
    const res = await axios.get(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?name=${encodeURIComponent('#' + numero)}`,
      {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const pedido = res.data.orders[0];
    return pedido;
  } catch (err) {
    console.error('Error consultando orden:', err.response?.data || err.message);
    return null;
  }
}



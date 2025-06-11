// src/services/shopifyCheckout.js
import axios from 'axios';

const SHOPIFY_STORE = 'natifbyissavasquez';
const ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;

export async function crearCheckout(variantId, cantidad = 1) {
  try {
    const res = await axios.post(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/checkouts.json`,
      {
        checkout: {
          line_items: [{ variant_id: variantId, quantity: cantidad }],
        },
      },
      {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.data.checkout.web_url;
  } catch (error) {
    console.error('Error al crear checkout:', error.response?.data || error.message);
    return null;
  }
}
export async function buscarPedidoPorNumero(numeroPedido) {
  try {
    const limpio = numeroPedido.replace(/[^0-9]/g, ''); // "#3075" → "3075"
    const nameBuscado = `#${limpio}`;

    const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?limit=250&status=any`;

    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const pedidos = response.data.orders;
    const pedido = pedidos.find(p => p.name === nameBuscado);

    if (!pedido) return null;

    return {
      pedido: pedido.name,
      cliente: `${pedido.customer?.first_name || ''} ${pedido.customer?.last_name || ''}`.trim(),
      productos: pedido.line_items.map(item => item.name),
      correo: pedido.email
    };
  } catch (error) {
    console.error("❌ Error buscando pedido por número:", error.response?.data || error.message);
    return null;
  }
}





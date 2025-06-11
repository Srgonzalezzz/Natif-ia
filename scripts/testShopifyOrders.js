import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SHOPIFY_STORE = 'natifbyissavasquez';
const ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;

async function buscarPedidoPorNumero(numeroPedido) {
  try {
    const limpio = numeroPedido.replace(/[^0-9]/g, ''); // "#3075" → "3075"
    const nameBuscado = `#${limpio}`;

    const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/orders.json?limit=250&status=any`;

    console.log("🔍 Buscando pedido por nombre:", nameBuscado);
    console.log("📡 URL:", url);

    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const pedidos = response.data.orders;
    console.log(`📦 Total pedidos recibidos: ${pedidos.length}`);

    // Mostrar todos los nombres de pedido
    pedidos.forEach(p => console.log(p.name));

    const pedido = pedidos.find(p => p.name === nameBuscado);

    if (!pedido) {
      console.log("❌ No se encontró el pedido:", nameBuscado);
      return;
    }

    console.log("✅ Pedido encontrado:", {
      pedido: pedido.name,
      cliente: `${pedido.customer?.first_name || ''} ${pedido.customer?.last_name || ''}`.trim(),
      productos: pedido.line_items.map(item => item.name),
      correo: pedido.email
    });
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

// CAMBIA AQUÍ el número de pedido que quieres probar
buscarPedidoPorNumero("#3075");

// src/services/shopifyService.js
import axios from 'axios';

const SHOPIFY_STORE = 'natifbyissavasquez';
const ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;

function traducirEstado(fulfillmentStatus, fulfillmentDetailStatus) {
  if (!fulfillmentStatus) return 'Pendiente de envío';
  if (fulfillmentStatus === 'fulfilled' && fulfillmentDetailStatus === 'success') {
    return 'Entregado';
  }
  if (fulfillmentStatus === 'partial' || fulfillmentDetailStatus === 'in_progress') {
    return 'En reparto / En proceso';
  }
  if (fulfillmentDetailStatus === 'cancelled') {
    return 'Envío cancelado';
  }
  return 'En proceso';
}

function traducirEstadoPago(estado) {
  if (!estado) return 'Pendiente de pago';
  const mapa = {
    paid: 'Pagado',
    pending: 'Pendiente de pago',
    authorized: 'Autorizado',
    refunded: 'Reembolsado',
    partially_refunded: 'Parcialmente reembolsado',
    voided: 'Anulado'
  };
  return mapa[estado] || estado;
}

function getFechaHace8Dias() {
  const hoy = new Date();
  const hace8 = new Date(hoy.setDate(hoy.getDate() - 15));
  return hace8.toISOString();
}

export async function buscarPedido(query) {
  try {
    const fechaFiltro = getFechaHace8Dias();

    // 🔹 Si parece email, traemos todos y filtramos aquí
    if (query.includes('@')) {
      const url = `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2025-07/orders.json?status=any&limit=250&created_at_min=${fechaFiltro}`;

      const res = await axios.get(url, {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      // Filtra pedidos por email exacto
      const pedidosEmail = res.data.orders.filter(
        (o) => o.email && o.email.toLowerCase() === query.toLowerCase()
      );

      if (pedidosEmail.length) {
        // Ordena por fecha de creación descendente
        pedidosEmail.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        const pedido = pedidosEmail[0];
        const fulfillment = pedido.fulfillments?.[0];

        return {
          tipo: "correo",
          pedido: pedido.name,
          estado: traducirEstado(pedido.fulfillment_status, fulfillment?.status),
          estado_pago: traducirEstadoPago(pedido.financial_status),
          tracking: fulfillment?.tracking_number || '',
          empresa_envio: fulfillment?.tracking_company || '',
          link: fulfillment?.tracking_url || '',
          productos: pedido.line_items.map((p) => p.title),
          cliente: `${pedido.customer?.first_name || ''} ${pedido.customer?.last_name || ''}`.trim(),
          correo: pedido.email,
          creado: pedido.created_at,
        };
      }

      return null;
    }

    // 🔹 Caso contrario, sigue con número de orden / guía
    const limpio = query.replace(/[^0-9]/g, '');

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
      const fulfillment = pedido.fulfillments?.[0];

      return {
        tipo: "orden",
        pedido: pedido.name,
        estado: traducirEstado(pedido.fulfillment_status, fulfillment?.status),
        estado_pago: traducirEstadoPago(pedido.financial_status),
        tracking: fulfillment?.tracking_number || '',
        empresa_envio: fulfillment?.tracking_company || '',
        link: fulfillment?.tracking_url || '',
        productos: pedido.line_items.map((p) => p.title),
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
            estado: traducirEstado(pedido.fulfillment_status, f.status),
            estado_pago: traducirEstadoPago(pedido.financial_status),
            tracking: f.tracking_number,
            empresa_envio: f.tracking_company,
            link: f.tracking_url,
            productos: pedido.line_items.map((p) => p.title),
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

// src/scripts/listarProductos.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SHOPIFY_STORE = 'natifbyissavasquez';
const ACCESS_TOKEN = process.env.SHOPIFY_TOKEN;

async function obtenerProductos() {
  try {
    const res = await axios.get(
      `https://${SHOPIFY_STORE}.myshopify.com/admin/api/2023-10/products.json?limit=50`,
      {
        headers: {
          'X-Shopify-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const productos = res.data.products;

    console.log(`🛍️ Productos encontrados: ${productos.length}\n`);
    productos.forEach((producto, i) => {
      console.log(`📦 Producto #${i + 1}: ${producto.title}`);
      producto.variants.forEach((variant, idx) => {
        console.log(`  └─ Variante ${idx + 1}:`);
        console.log(`     🆔 variant_id: ${variant.id}`);
        console.log(`     🏷️ Título: ${variant.title}`);
        console.log(`     💲 Precio: ${variant.price}\n`);
      });
    });
  } catch (err) {
    console.error('❌ Error al obtener productos:', err.response?.data || err.message);
  }
}

obtenerProductos();

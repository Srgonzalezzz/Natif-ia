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

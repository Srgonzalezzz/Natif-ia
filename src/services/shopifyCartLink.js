const SHOPIFY_STORE = 'natifbyissavasquez';

export function generarLinkDeCompra(variantId, cantidad = 1) {
  return `https://${SHOPIFY_STORE}.myshopify.com/cart/${variantId}:${cantidad}`;
}

export function generarLinkCarritoMultiple(items = []) {
  const base = `https://${SHOPIFY_STORE}.myshopify.com/cart/`;
  const query = items.map(i => `${i.variantId}:${i.cantidad}`).join(',');
  return `${base}${query}`;
}

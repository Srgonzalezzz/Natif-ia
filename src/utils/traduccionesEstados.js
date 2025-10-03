// src/utils/traduccionesEstados.js
// Funciones para traducir estados de Shopify a español

/**
 * Traduce el estado de envío (fulfillment_status) a español
 * @param {string} estado - fulfilled, partial, null...
 * @returns {string}
 */
export function traducirEstadoEnvio(estado) {
  if (!estado) return 'Pendiente de envío';
  const mapa = {
    fulfilled: 'Enviado / Entregado',
    partial: 'Parcialmente enviado',
    null: 'Pendiente de envío'
  };
  return mapa[estado] || estado;
}

/**
 * Traduce el estado de pago (financial_status) a español
 * @param {string} estado - paid, pending, authorized, refunded...
 * @returns {string}
 */
export function traducirEstadoPago(estado) {
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

/**
 * Traduce el estado del fulfillment (fulfillments[].status) a español
 * @param {string} estado - success, in_progress, cancelled, open...
 * @returns {string}
 */
export function traducirEstadoFulfillment(estado) {
  if (!estado) return '';
  const mapa = {
    success: 'Envío completado',
    in_progress: 'En proceso',
    cancelled: 'Cancelado',
    open: 'Abierto'
  };
  return mapa[estado] || estado;
}

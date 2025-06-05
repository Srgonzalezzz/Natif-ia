export default function detectarIntencion(texto) {
  texto = texto.toLowerCase();

  if (texto.includes('pedido') || texto.includes('rastreo') || texto.includes('guía')) {
    return 'consulta_pedido';
  }

  if (
    texto.includes('reclamo') ||
    texto.includes('inconformidad') ||
    texto.includes('queja') ||
    texto.includes('mal servicio') ||
    texto.includes('problema con el producto') ||
    texto.includes('llegó mal') ||
    texto.includes('no me llegó')
  ) {
    return 'reclamo';
  }

  return 'desconocido';
}

export function esEstadoVigente(estado) {
  if (!estado?.ultimaActualizacion) return false;
  const ahora = Date.now();
  const hace24h = 24 * 60 * 60 * 1000;
  return (ahora - estado.ultimaActualizacion) <= hace24h;
}

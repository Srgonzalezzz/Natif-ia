export function esCorreoValido(correo) {
  return /\S+@\S+\.\S+/.test(correo);
}

export function esTrackingValido(valor) {
  return /^[A-Z0-9\-]{6,30}$/.test(valor);
}

export function normalizarTextoClave(str = '') {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

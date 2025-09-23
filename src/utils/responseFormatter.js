// src/utils/responseFormatter.js
export function formatRespuestaFromSource(source, intencion = '') {
  if (!source) return null;

  if (Array.isArray(source)) {
    source = source[0];
  }

  const { origen, texto, archivo } = source;

  switch (origen) {
    case 'pdf':
      return `📄 Fuente: ${archivo}\n\n${texto}`;
    case 'flujo':
      return texto;
    case 'gemini':
      return texto;
    default:
      return texto;
  }
}

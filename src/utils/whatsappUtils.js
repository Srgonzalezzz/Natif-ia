export function limitarTitulo(texto, max = 20) {
    return texto?.trim().slice(0, max) || 'Opción';
}

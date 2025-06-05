
export const greetings = [
    "hola", "hi", "buenas", "buenos días", "buenas tardes", "buenas noches",
    "hola qué tal", "qué tal", "saludos", "hey", "hello"
];

export const closingExpressions = [
    "gracias", "muchas gracias", "mil gracias", "ok gracias",
    "listo gracias", "está bien gracias", "vale gracias", "todo bien gracias"
];

const Steps = {
    // Estados generales del flujo
    ESPERANDO_GUIA: 'esperando_guia',
    QUESTION: 'question',
    ESPERANDO_INTERACCION: 'esperando_interaccion',

    // Estados opcionales para extensiones específicas
    ESPERANDO_DATOS_FACTURA: 'esperando_datos_factura',
    ESPERANDO_DATOS_DEVOLUCION: 'esperando_datos_devolucion',
    ESPERANDO_TIPO_COMPRA: 'esperando_tipo_compra',
    ESPERANDO_RESEÑA: 'esperando_resena',
    ESPERANDO_COMENTARIO: 'esperando_comentario',
    ESPERANDO_TIPO_ALIANZA: 'esperando_tipo_alianza',

    // Para controlar seguimiento con botones
    PREGUNTA_OPCIONAL: 'pregunta_opcional',
    INACTIVO: 'inactivo',
};

export default Steps;

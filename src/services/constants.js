
export const greetings = [
    "hola", "hi", "buenas", "buenos días", "buenas tardes", "buenas noches",
    "hola qué tal", "qué tal", "saludos", "hey", "hello", "menu", "empezar",
];

export const closingExpressions = [
    "gracias", "muchas gracias", "mil gracias", "ok gracias",
    "listo gracias", "está bien gracias", "vale gracias", "todo bien gracias", "perfecto gracias",
    "gracias por todo", "gracias por la ayuda", "gracias por tu ayuda", "gracias por su ayuda",
    "gracias por atenderme", "gracias por su atención", "gracias por atenderme", "gracias por su atención",
    "eso es todo gracias", "eso es todo", "eso es todo por ahora", "eso es todo por el momento",
    "eso es todo, gracias", "eso es todo por ahora, gracias", "eso es todo por el momento, gracias",
    "adiós", "adios", "hasta luego", "nos vemos", "chao", "chau", "bye", "hasta la próxima",
    "hasta pronto", "nos hablamos", "nos vemos luego", "nos vemos pronto", "nos vemos más tarde",
    "me voy", "me despido", "me retiro", "me desconecto", "me despido, gracias", "me retiro, gracias", "me desconecto, gracias",
    "hasta la vista", "hasta la vista, baby", "cuídate", "cuídese", "que estés bien", "que esté bien",
    "que tengas un buen día", "que tenga un buen día", "que tengas una buena tarde", "que tenga una buena tarde",
    "que tengas una buena noche", "que tenga una buena noche", "feliz día", "feliz tarde", "feliz noche",
    "bendiciones", "bendiciones, gracias", "bendiciones, muchas gracias", "bendiciones, mil gracias",
    "gracias, bendiciones", "muchas gracias, bendiciones", "mil gracias, bendiciones"
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

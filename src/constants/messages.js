export const mensajes = {
  cierre: "✨ ¡Gracias por confiar en nosotros! Si vuelves a necesitar ayuda, solo escríbeme por este mismo chat 💬. ¡Que tengas un excelente día! 🙌",
  errorGenerico: "😓 Uy, algo salió mal procesando tu solicitud. Intenta nuevamente o escribe *menu* para volver al inicio.",
  preguntaAyuda: "¿Mi respuesta fue de ayuda?",
  botonesAyuda: [
    { type: 'reply', reply: { id: 'option_4', title: "Si, gracias" } },
    { type: 'reply', reply: { id: 'option_5', title: "otra pregunta" } },
    { type: 'reply', reply: { id: 'option_6', title: "Hablar con soporte" } }
  ],
  inactividad: "Finalicé el chat por inactividad. Si necesitas más ayuda, saluda nuestro chat para comenzar de nuevo.",
  graciasDetectado: (texto) => texto.toLowerCase().includes('gracias')
};

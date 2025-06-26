import stateStore from '../stateStore.js';
import whatsappService from '../whatsappService.js';

export async function clearUserTimers(userId) {
  const state = await stateStore.get(userId);
  if (state?.timeout) clearTimeout(state.timeout);
  if (state?.finalClosureTimeout) clearTimeout(state.finalClosureTimeout);
}

export function setInactivityTimers(userId) {
  const warningDelay = 60000; // 1 minuto para mostrar opciones
  const finalDelay = 60000;   // 1 minuto más para cerrar el chat

  const run = async () => {
    const currentState = await stateStore.get(userId);
    if (currentState?.timeout) clearTimeout(currentState.timeout);
    if (currentState?.finalClosureTimeout) clearTimeout(currentState.finalClosureTimeout);

    const timeout = setTimeout(async () => {
      const state = await stateStore.get(userId);
      if (!state) return;

      await whatsappService.sendInteractiveButtons(userId, "¿Mi respuesta fue de ayuda?", [
        { type: 'reply', reply: { id: 'option_4', title: "Si, gracias" } },
        { type: 'reply', reply: { id: 'option_5', title: "otra pregunta" } },
        { type: 'reply', reply: { id: 'option_6', title: "Hablar con soporte" } },
      ]);

      const finalClosureTimeout = setTimeout(async () => {
        const checkState = await stateStore.get(userId);
        if (!checkState) return;
        await whatsappService.sendMessage(userId, "Finalicé el chat por inactividad. Si necesitas más ayuda, saluda nuestro chat para comenzar de nuevo.");
        await stateStore.delete(userId);
      }, finalDelay);

      await stateStore.set(userId, {
        ...state,
        finalClosureTimeout,
        ultimaActualizacion: Date.now()
      });
    }, warningDelay);

    await stateStore.set(userId, {
      ...(currentState || {}),
      timeout,
      ultimaActualizacion: Date.now()
    });
  };

  run();
}

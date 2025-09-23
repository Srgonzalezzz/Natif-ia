// src/services/timers.js
import whatsappService from '../services/whatsappService.js';
// import { sendWelcomeMenu } from '../handlers/menuHandler.js';
import { deleteEstado } from '../utils/stateManager.js';

const timers = new Map();

export function clearUserTimers(userId) {
  const t = timers.get(userId);
  if (!t) return;
  clearTimeout(t.warningTimer);
  clearTimeout(t.finalTimer);
  timers.delete(userId);
}

export function setInactivityTimers(userId, { warningDelay = 60000, finalDelay = 60000 } = {}) {
  clearUserTimers(userId);

  const warningTimer = setTimeout(async () => {
    try {
      await whatsappService.sendInteractiveButtons(userId, "¿Mi respuesta fue de ayuda?", [
        { type: 'reply', reply: { id: 'option_4', title: "Si, gracias" } },
        { type: 'reply', reply: { id: 'option_5', title: "otra pregunta" } },
        { type: 'reply', reply: { id: 'option_6', title: "Hablar con soporte" } },
      ]);
    } catch (err) {
      console.warn('warningTimer send error', err?.message || err);
    }
  }, warningDelay);

  const finalTimer = setTimeout(async () => {
    try {
      await whatsappService.sendMessage(userId, "Finalicé el chat por inactividad. Si necesitas más ayuda, saluda nuestro chat para comenzar de nuevo.");
      await deleteEstado(userId);
      clearUserTimers(userId);
    } catch (err) {
      console.warn('finalTimer error', err?.message || err);
    }
  }, warningDelay + finalDelay);

  timers.set(userId, { warningTimer, finalTimer });
}

import whatsappService from '../services/whatsappService.js';
import { deleteEstado } from '../utils/stateManager.js';

const timers = new Map();

export function clearUserTimers(userId) {
  const t = timers.get(userId);
  if (!t) return;

  clearTimeout(t.warningTimer);
  clearTimeout(t.finalTimer);
  timers.delete(userId);
}

/**
 * Timers de inactividad
 * @param {string} userId
 * @param {object} options
 * @param {number} options.warningDelay - tiempo antes del warning
 * @param {number} options.finalDelay - tiempo adicional antes del cierre
 */
export function setInactivityTimers(
  userId,
  { warningDelay = 2 * 60_000, finalDelay = 3 * 60_000 } = {}
) {
  clearUserTimers(userId);

  // ⏰ Advertencia
  const warningTimer = setTimeout(async () => {
    try {
      await whatsappService.sendInteractiveButtons(userId, "¿Mi respuesta fue de ayuda?", [
        { type: 'reply', reply: { id: 'option_4', title: "Sí, gracias" } },
        { type: 'reply', reply: { id: 'option_5', title: "Otra pregunta" } },
        // { type: 'reply', reply: { id: 'option_6', title: "Hablar con soporte" } },
      ]);
    } catch (err) {
      console.warn("⚠️ warningTimer error:", err?.message || err);
    }
  }, warningDelay);

  // ⏰ Cierre final
  const finalTimer = setTimeout(async () => {
    try {
      await whatsappService.sendMessage(
        userId,
        "✨ Finalicé el chat por inactividad. Si necesitas más ayuda, vuelve a escribirme 💬"
      );
      await deleteEstado(userId);
      clearUserTimers(userId); // ✅ aseguramos que no se reactiven timers
    } catch (err) {
      console.warn("⚠️ finalTimer error:", err?.message || err);
    }
  }, warningDelay + finalDelay);

  timers.set(userId, { warningTimer, finalTimer });
}

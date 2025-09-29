// src/services/handlers/handleInteractiveMessage.js
import { getEstado } from '../../utils/stateManager.js';
import {
  handleAccionCarrito,
  handleEliminarProducto,
  handleProductoSeleccionado
} from './carritoHandler.js';
import {
  handleMenuOption,
  handleFeedbackButtons
} from './menuHandler.js';
import { resolverSeleccionFlujo } from './flujoHandler.js';

export default async function handleInteractiveMessage(message, senderInfo) {
  const userId = message.from;
  const estado = await getEstado(userId);

  const optionId =
    message.interactive?.button_reply?.id ||
    message.interactive?.list_reply?.id;

  const optionTitle =
    message.interactive?.button_reply?.title?.toLowerCase().trim() ||
    message.interactive?.list_reply?.title?.toLowerCase().trim();

  // ----------------------
  // 1) Flujos conversacionales
  // ----------------------
  if (optionId?.startsWith("flujo_")) {
    return resolverSeleccionFlujo(userId, optionId, estado);
  }

  // ----------------------
  // 2) Menú principal
  // ----------------------
  const menuOptions = ["opcion_1", "opcion_2", "opcion_3"];
  if (menuOptions.includes(optionId)) {
    return handleMenuOption(userId, optionTitle);
  }

  // ----------------------
  // 3) Feedback post-respuesta
  // ----------------------
  const feedbackOptions = ["si, gracias", "otra pregunta", "hablar con soporte"];
  if (feedbackOptions.includes(optionTitle)) {
    return handleFeedbackButtons(userId, optionTitle);
  }

  // ----------------------
  // 4) Acciones de carrito
  // ----------------------
  const carritoAcciones = ["seguir_comprando", "ver_carrito", "finalizar_compra"];
  if (carritoAcciones.includes(optionId)) {
    return handleAccionCarrito(optionId, userId, estado);
  }

  if (optionId?.startsWith("eliminar_")) {
    return handleEliminarProducto(userId, optionId, estado);
  }

  if (estado?.estado === "carrito" && estado?.subestado === "seleccionando_producto") {
    return handleProductoSeleccionado(userId, optionId, optionTitle, estado);
  }

  // ----------------------
  // 5) Fallback → menú
  // ----------------------
  return handleMenuOption(userId, optionTitle);
}

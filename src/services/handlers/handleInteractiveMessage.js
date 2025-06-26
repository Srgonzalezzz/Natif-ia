import stateStore from '../stateStore.js';
import {
    handleAccionCarrito,
    handleEliminarProducto,
    handleProductoSeleccionado
} from './carritoHandler.js';
import {
    handleMenuOption,
    handleFeedbackButtons
} from './menuHandler.js';
import {
    resolverSeleccionFlujo
} from './flujoHandler.js';

export default async function handleInteractiveMessage(message, senderInfo) {
    const userId = message.from;
    const estado = await stateStore.get(userId);

    const optionId = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id;
    const optionTitle = message.interactive?.button_reply?.title?.toLowerCase().trim() ||
        message.interactive?.list_reply?.title?.toLowerCase().trim();

    if (optionId?.startsWith("flujo_")) {
        await resolverSeleccionFlujo(userId, optionId, estado);
        return;
    }

    if (["opcion_1", "opcion_2", "opcion_3"].includes(optionId)) {
        return await handleMenuOption(userId, optionTitle);
    }

    if (["si, gracias", "otra pregunta", "hablar con soporte"].includes(optionTitle)) {
        return await handleFeedbackButtons(userId, optionTitle);
    }

    if (["seguir_comprando", "ver_carrito", "finalizar_compra"].includes(optionId)) {
        return await handleAccionCarrito(optionId, userId, estado);
    }

    if (optionId?.startsWith("eliminar_")) {
        return await handleEliminarProducto(userId, optionId, estado);
    }

    if (estado?.estado === 'carrito' && estado?.subestado === 'seleccionando_producto') {
        return await handleProductoSeleccionado(userId, optionId, optionTitle, estado);
    }

    return await handleMenuOption(userId, optionTitle);
}

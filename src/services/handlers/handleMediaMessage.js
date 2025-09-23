// src/services/handlers/handleMediaMessage.js
import whatsappService from '../whatsappService.js';
import { guardarReclamoEnSheet } from '../../utils/googleOAuthLogger.js';
import { sendWelcomeMenu } from "./menuHandler.js";
import { resetEstado } from '../../utils/stateManager.js';

export default async function handleMediaMessage(message, userId, senderInfo) {
    const estado = await (await import('../stateStore.js')).default.get(userId) || {}; // fallback minimal

    switch (estado.subestado) {
        case "esperando_foto_equivocado":
            if (message.type === "image") {
                await whatsappService.sendMessage(userId, "✅ Recibimos la foto de tu producto equivocado. Nuestro equipo revisará el caso.");
                await guardarReclamoEnSheet({
                    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
                    cliente: senderInfo?.name || "Desconocido",
                    numero: userId,
                    reclamo: "Producto equivocado",
                    tipo: "Imagen",
                    estado: "Nuevo",
                });
                await resetEstado(userId);
                await sendWelcomeMenu(userId);
            } else {
                await whatsappService.sendMessage(userId, "❌ Por favor envíame una foto del producto.");
            }
            break;

        case "esperando_foto_danado":
            if (message.type === "image" || message.type === "video") {
                await whatsappService.sendMessage(userId, "✅ Recibimos tu evidencia (foto/video) del producto dañado. Lo estamos revisando.");
                await guardarReclamoEnSheet({
                    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
                    cliente: senderInfo?.name || "Desconocido",
                    numero: userId,
                    reclamo: "Producto dañado",
                    tipo: message.type === "image" ? "Imagen" : "Video",
                    estado: "Nuevo",
                });
                await resetEstado(userId);
                await sendWelcomeMenu(userId);
            } else {
                await whatsappService.sendMessage(userId, "❌ Necesitamos una foto o video del producto dañado.");
            }
            break;

        case "esperando_texto_incompleto":
            if (message.type === "text") {
                await whatsappService.sendMessage(userId, `✅ Recibimos tu reporte: "${message.text.body}". Gracias por informarnos, lo solucionaremos pronto.`);
                await guardarReclamoEnSheet({
                    fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
                    cliente: senderInfo?.name || "Desconocido",
                    numero: userId,
                    reclamo: `Pedido incompleto - Faltó: ${message.text.body}`,
                    tipo: "Texto",
                    estado: "Nuevo",
                });
                await resetEstado(userId);
                await sendWelcomeMenu(userId);
            } else {
                await whatsappService.sendMessage(userId, "Por favor indícanos por texto qué producto faltó en tu pedido.");
            }
            break;

        default:
            await whatsappService.sendMessage(userId, "⚠️ Recibí tu archivo, pero no sé cómo procesarlo en este contexto.");
            break;
    }
}

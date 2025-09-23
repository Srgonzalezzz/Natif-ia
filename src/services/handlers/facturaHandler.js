// src/services/handlers/facturaHandler.js
import stateStore from "../stateStore.js";
import whatsappService from "../whatsappService.js";
import { guardarFacturaEnSheet } from '../../utils/googleOAuthLogger.js';
import { sendWelcomeMenu } from "./menuHandler.js";
import { setEstado, updateEstado, resetEstado } from '../../utils/stateManager.js';

// ----------------------
// HANDLER PRINCIPAL
// ----------------------
export default async function facturaHandler(userId, message, state) {
  try {
    if (state?.subestado === "factura_electronica") {
      const pedido = message.trim();
      if (!pedido.match(/^\d+$/)) {
        await whatsappService.sendMessage(userId, "⚠️ Por favor indícanos un número de pedido válido.");
        return;
      }
      await setEstado(userId, 'factura', 'esperando_datos_factura', { pedido });
      await whatsappService.sendMessage(userId, "📄 Perfecto. Ahora necesito los siguientes datos (separados por comas):\n\n" +
        "1️⃣ Nombre / Razón social\n2️⃣ NIT o Cédula\n3️⃣ Dirección\n4️⃣ Ciudad\n5️⃣ Correo electrónico\n\nEjemplo:\n*Mi Empresa S.A.S, 123456789, Calle 123 #45-67, Bogotá, correo@dominio.com*");
      return;
    }

    if (state?.subestado === "esperando_datos_factura") {
      const partes = message.split(",").map((p) => p.trim());

      if (partes.length < 5) {
        await whatsappService.sendMessage(userId, "⚠️ Me faltan datos. Recuerda enviarlos en el formato:\n\n*Nombre / Razón social, NIT o Cédula, Dirección, Ciudad, Correo electrónico*");
        return;
      }

      const [razonSocial, nit, direccion, ciudad, correo] = partes;

      if (!/\S+@\S+\.\S+/.test(correo)) {
        await whatsappService.sendMessage(userId, "⚠️ El correo no parece válido. Por favor revisa el formato e intenta de nuevo.");
        return;
      }

      const datosFactura = {
        pedido: state.pedido,
        cliente: userId,
        "Nombre / Razón social": razonSocial,
        "NIT o Cédula": nit,
        Dirección: direccion,
        Ciudad: ciudad,
        Correo: correo,
      };

      await guardarFacturaEnSheet(datosFactura);

      await whatsappService.sendMessage(userId, "✅ Tu solicitud de factura fue registrada correctamente.\n\nNuestro equipo la procesará y te la enviaremos al correo proporcionado.");

      await resetEstado(userId);
      await sendWelcomeMenu(userId);
      return;
    }
  } catch (err) {
    console.error("❌ Error en facturaHandler:", err);
    await whatsappService.sendMessage(userId, "😓 Ocurrió un error al procesar tu factura. Intenta nuevamente más tarde.");
  }
}

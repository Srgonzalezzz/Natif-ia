// src/services/handlers/facturaHandler.js
import whatsappService from "../whatsappService.js";
import { guardarFacturaEnSheet } from '../../utils/googleOAuthLogger.js';
import { sendWelcomeMenu } from "./menuHandler.js";
import { setEstado, resetEstado } from '../../utils/stateManager.js';

// ----------------------
// Helpers internos
// ----------------------
function esPedidoValido(pedido) {
  return /^\d+$/.test(pedido);
}

function esCorreoValido(correo) {
  return /\S+@\S+\.\S+/.test(correo);
}

function parseDatosFactura(message) {
  const partes = message.split(",").map((p) => p.trim());
  if (partes.length < 5) return null;

  const [razonSocial, nit, direccion, ciudad, correo] = partes;
  if (!esCorreoValido(correo)) return null;

  return { razonSocial, nit, direccion, ciudad, correo };
}

// ----------------------
// Handler principal
// ----------------------
export default async function facturaHandler(userId, message, state) {
  try {
    // Paso 1: Número de pedido
    if (state?.subestado === "factura_electronica") {
      const pedido = message.trim();

      if (!esPedidoValido(pedido)) {
        await whatsappService.sendMessage(
          userId,
          "⚠️ Por favor indícanos un número de pedido válido."
        );
        return;
      }

      await setEstado(userId, "factura", "esperando_datos_factura", { pedido });
      await whatsappService.sendMessage(
        userId,
        "📄 Perfecto. Ahora necesito los siguientes datos (separados por comas):\n\n" +
          "1️⃣ Nombre / Razón social\n2️⃣ NIT o Cédula\n3️⃣ Dirección\n4️⃣ Ciudad\n5️⃣ Correo electrónico\n\n" +
          "Ejemplo:\n*Mi Empresa S.A.S, 123456789, Calle 123 #45-67, Bogotá, correo@dominio.com*"
      );
      return;
    }

    // Paso 2: Datos de facturación
    if (state?.subestado === "esperando_datos_factura") {
      const datos = parseDatosFactura(message);

      if (!datos) {
        await whatsappService.sendMessage(
          userId,
          "⚠️ Datos incompletos o correo inválido.\n\nFormato esperado:\n" +
            "*Nombre / Razón social, NIT o Cédula, Dirección, Ciudad, Correo electrónico*"
        );
        return;
      }

      const datosFactura = {
        pedido: state.pedido,
        cliente: userId,
        "Nombre / Razón social": datos.razonSocial,
        "NIT o Cédula": datos.nit,
        Dirección: datos.direccion,
        Ciudad: datos.ciudad,
        Correo: datos.correo,
      };

      await guardarFacturaEnSheet(datosFactura);

      await whatsappService.sendMessage(
        userId,
        "✅ Tu solicitud de factura fue registrada correctamente.\n\n" +
          "Nuestro equipo la procesará y te la enviaremos al correo proporcionado."
      );

      await resetEstado(userId);
      await sendWelcomeMenu(userId);
    }
  } catch (err) {
    console.error("❌ Error en facturaHandler:", err);
    await whatsappService.sendMessage(
      userId,
      "😓 Ocurrió un error al procesar tu factura. Intenta nuevamente más tarde."
    );
  }
}

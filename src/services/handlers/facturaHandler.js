import whatsappService from '../whatsappService.js';
import { buscarPedidoPorNumero } from '../shopifyService.js';
import { guardarFacturaEnSheet } from '../../utils/googleOAuthLogger.js';
import flujosConversacionales from '../../../data/flows.js';
import stateStore from '../stateStore.js';
import { sendWelcomeMenu } from './menuHandler.js'; // 


export default async function factura(userId, messageText, estado) {
  const flujo = flujosConversacionales['flujo_4'];
  const step = estado.subestado;
  const texto = messageText.trim();

  if (step === 'factura_electronica') {
    const pedido = await buscarPedidoPorNumero(texto);

    if (!pedido) {
      await whatsappService.sendMessage(userId, "⚠️ No encontramos ese número de pedido. Asegúrate de escribirlo correctamente, como por ejemplo: #3075.");
      return;
    }

    await whatsappService.sendMessage(userId, `✅ Pedido encontrado:\n*Pedido:* ${pedido.pedido}\n*Cliente:* ${pedido.cliente}\n*Productos:* ${pedido.productos.join(', ')}`);
    await whatsappService.sendMessage(userId, "Para emitir la factura necesito algunos datos adicionales. Vamos uno por uno 😊");

    await whatsappService.sendMessage(userId,
      `Por favor indícame los siguientes datos separados por comas:\n\n` +
      `*1.* Nombre / Razón social\n*2.* NIT o Cédula\n*3.* Dirección\n*4.* Ciudad\n*5.* Correo\n\n` +
      `Ejemplo:\nNATIF S.A.S, 900123456, Calle 123 #45-67, Bogotá, facturas@natif.com`
    );

    await stateStore.set(userId, {
      estado: 'factura',
      subestado: 'esperando_datos_factura',
      datos_factura: {
        pedido: texto,
        cliente: pedido.cliente,
        productos: pedido.productos,
        ultimaActualizacion: Date.now()
      }
    });

    return;
  }

  if (step === 'esperando_datos_factura') {
    const partes = texto.split(',').map(p => p.trim());

    if (partes.length < 5) {
      await whatsappService.sendMessage(userId, "⚠️ Me faltan algunos datos. Por favor indícalos todos separados por comas como en el ejemplo.");
      return;
    }

    const [razon, nit, direccion, ciudad, correo] = partes;

    const datosFactura = {
      ...estado.datos_factura,
      "Nombre / Razón social": razon,
      "NIT o Cédula": nit,
      "Dirección": direccion,
      "Ciudad": ciudad,
      "Correo": correo
    };

    try {
      await guardarFacturaEnSheet(datosFactura); // 👈 Puede fallar, por eso lo encerramos en try-catch

      await whatsappService.sendMessage(userId, "✅ ¡Gracias! Tu factura será enviada en un plazo máximo de 48 horas hábiles."); // ✅ Confirmación
      await sendWelcomeMenu(userId); // 👈 Solo se ejecuta si todo sale bien

      await stateStore.set(userId, {
        estado: 'inicio',
        subestado: 'menu_principal',
        ultimaActualizacion: Date.now()
      });

    } catch (err) {
      console.error("❌ Error guardando datos de factura:", err);
      await whatsappService.sendMessage(userId, "😓 Ocurrió un error al registrar tu factura. Intenta más tarde o contacta a soporte.");
    }

    return;
  }

}


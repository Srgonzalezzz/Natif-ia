import { registrarLog } from '../src/utils/googleOAuthLogger.js';

registrarLog({
  userId: '123456',
  pregunta: '¿Cuál es el precio del labial?',
  respuesta: 'El labial cuesta $49.900 COP',
  fuente: 'local',
  intencion: 'consultar_producto',
});

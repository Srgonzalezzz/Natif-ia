// runTestCases.js

import fs from 'fs/promises';
import path from 'path';
import whatsappService from '../whatsappService.js'; // Cambia a whatsappService.js para producción
import handleTextMessage from '../handlers/handleTextMessage.js';
import handleInteractiveMessage from '../handlers/handleInteractiveMessage.js';
import stateStore from '../stateStore.js';

const __dirname = path.resolve();
const TEST_USER_ID = process.env.TEST_PHONE || '573001234567';

console.log('\n🧪 Iniciando pruebas automáticas para IA NATIF...');

const testPath = path.join(__dirname, 'src', 'services', 'test', 'testCases_NATIF.json');
const content = await fs.readFile(testPath, 'utf-8');
const testCases = JSON.parse(content);

for (let i = 0; i < testCases.length; i++) {
  const test = testCases[i];
  const userId = TEST_USER_ID;

  if (!test.input || typeof test.input !== 'string') {
    console.warn(`⚠️ El test "${test.caso}" no tiene un input válido de tipo texto.`);
    continue;
  }

  if (test.estadoInicial) await stateStore.set(userId, test.estadoInicial);

  try {
    if (test.tipo === 'text') {
      const textInput = typeof test.input === 'string' ? test.input : '';
      await handleTextMessage({ from: userId, text: { body: textInput } }, { wa_id: userId });
    } else if (test.tipo === 'interactive') {
      const msg = {
        from: userId,
        interactive: {
          [test.subtipo]: {
            id: test.optionId,
            title: test.optionTitle
          }
        }
      };
      await handleInteractiveMessage(msg, { wa_id: userId });
    }
  } catch (err) {
    console.error(`❌ Error ejecutando prueba "${test.caso}":`, err.message);
  }

  const result = await stateStore.get(userId);
  const historial = result?.historial || [];
  const respuesta = historial.at(-1)?.texto || "";

  if (typeof respuesta === 'string' && respuesta.toLowerCase().includes(test.esperado.toLowerCase())) {
    console.log(`✅ ${test.caso} pasó.`);
  } else {
    console.log(`❌ ${test.caso} falló.`);
    console.log(`   → Esperado: ${test.esperado}`);
    console.log(`   → Recibido: ${respuesta}`);
  }
}

console.log('\n✅ Pruebas finalizadas.');

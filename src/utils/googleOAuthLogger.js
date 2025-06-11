// src/utils/googleOAuthLogger.js
import fs from 'fs/promises';
import { google } from 'googleapis';
import readline from 'readline';
import open from 'open';

const TOKEN_PATH = './token.json';
const CREDENTIALS_PATH = './oauth2.keys.json';
const SPREADSHEET_ID = '1OodHu-T3TRIDhP4Cp3rccviHgl-IRrmJBBUDmWU_sW0';
const SHEET_NAME = 'Logs';

// Función que se ejecuta una sola vez para generar el token
async function authorize() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);
  } catch {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    console.log('📢 Abriendo navegador para autenticación...');
    await open(authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise(resolve =>
      rl.question('🔐 Ingresa el código que ves en el navegador: ', resolve)
    );

    rl.close();

    const { tokens } = await oAuth2Client.getToken(code);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    oAuth2Client.setCredentials(tokens);
    console.log('✅ Token guardado con éxito.');
  }

  return oAuth2Client;
}

// Función de log de mensajes al Sheet
export async function registrarLog({
  userId,
  pregunta,
  respuesta,
  fuente = '',
  intencion = '',
  latencia = ''
}) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toISOString();
    const row = [[
      timestamp,
      userId,
      pregunta || '',
      typeof respuesta === 'object' ? JSON.stringify(respuesta).slice(0, 1000) : String(respuesta),
      fuente || '',
      intencion || '',
      latencia || ''
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: row },
    });
  } catch (err) {
    console.error("❌ Error al registrar log:", err.response?.data || err.message);
  }
}

async function guardarFacturaEnSheet(datosFactura) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const fila = [
      new Date().toLocaleString(),                          // Fecha
      datosFactura.pedido,
      datosFactura.cliente,
      datosFactura["Nombre / Razón social"],
      datosFactura["NIT o Cédula"],
      datosFactura["Dirección"],
      datosFactura["Ciudad"],
      datosFactura["Correo"],
      datosFactura.productos?.join(', ') || ''             // Lista de productos
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID, // Usa el mismo ID
      range: 'Facturas!A1', // Asegúrate que la hoja se llame 'Facturas'
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [fila] }
    });

    console.log("✅ Factura registrada en hoja 'Facturas'");
  } catch (error) {
    console.error("❌ Error guardando datos de factura:", error.response?.data || error.message);
  }
}
export { guardarFacturaEnSheet };




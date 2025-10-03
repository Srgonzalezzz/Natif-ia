import fs from "fs/promises";
import { google } from "googleapis";
import readline from "readline";
import open from "open";

const TOKEN_PATH = "./token.json";
const CREDENTIALS_PATH = "./credentials.json"; // Renombrado más estándar
const SPREADSHEET_ID = "1OodHu-T3TRIDhP4Cp3rccviHgl-IRrmJBBUDmWU_sW0";

// Definimos los nombres de las pestañas
const SHEETS = {
  logs: "Logs",
  facturas: "Facturas",
  reclamos: "Reclamos",
};

// --- AUTORIZACIÓN ---
// utils/googleOAuthLogger.js
// --- AUTORIZACIÓN ---
export async function authorize() {   // 👈 aquí va el export
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = JSON.parse(await fs.readFile(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(token);
  } catch {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file" // Scope para Drive
      ],
    });

    console.log("📢 Abriendo navegador para autenticación...");
    await open(authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise((resolve) =>
      rl.question("🔐 Ingresa el código que ves en el navegador: ", resolve)
    );

    rl.close();

    const { tokens } = await oAuth2Client.getToken(code);
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    oAuth2Client.setCredentials(tokens);
    console.log("✅ Token guardado con éxito.");
  }

  return oAuth2Client;
}



// --- LOGS ---
export async function registrarLog({
  userId,
  pregunta,
  respuesta,
  fuente = "",
  intencion = "",
  latencia = "",
}) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });

    const fecha = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
    });

    const row = [
      [
        fecha,
        userId,
        pregunta || "",
        typeof respuesta === "object"
          ? JSON.stringify(respuesta).slice(0, 1000)
          : String(respuesta),
        fuente,
        intencion,
        latencia,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.logs}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: row },
    });
  } catch (err) {
    console.error("❌ Error al registrar log:", err.response?.data || err.message);
  }
}

// --- FACTURAS ---
export async function guardarFacturaEnSheet(datosFactura) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });

    const fila = [
      new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      datosFactura.pedido,
      datosFactura.cliente,
      datosFactura["Nombre / Razón social"],
      datosFactura["NIT o Cédula"],
      datosFactura["Dirección"],
      datosFactura["Ciudad"],
      datosFactura["Correo"],
      datosFactura.productos?.join(", ") || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.facturas}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [fila] },
    });

    console.log("✅ Factura registrada en hoja 'Facturas'");
  } catch (error) {
    console.error("❌ Error guardando datos de factura:", error.response?.data || error.message);
  }
}

// --- RECLAMOS ---
export async function guardarReclamoEnSheet({
  fecha,
  cliente,
  numero,
  reclamo,
  tipo = "",
  estado = "",
  evidencia = "" // 🔹 nuevo parámetro para la URL en Drive
}) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });

    const numeroLimpio = numero.replace(/[^0-9]/g, "");
    const linkWhatsapp = `https://wa.me/${numeroLimpio}`;

    // 🔹 añadimos evidencia como última columna
    const fila = [fecha, cliente, numero, reclamo, tipo, estado, linkWhatsapp, evidencia];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.reclamos}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [fila] },
    });

    console.log("✅ Reclamo registrado en hoja 'Reclamos'");
  } catch (error) {
    console.error("❌ Error guardando datos del reclamo:", error.response?.data || error.message);
  }
}


// src/utils/generateToken.js
import fs from "fs/promises";
import { google } from "googleapis";
import readline from "readline";
import open from "open";

const TOKEN_PATH = "./token.json";
const CREDENTIALS_PATH = "./credentials.json";

async function generateToken() {
  const credentials = JSON.parse(await fs.readFile(CREDENTIALS_PATH, "utf8"));
  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0] // normalmente "http://localhost"
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/spreadsheets"],
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
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("✅ Token guardado en", TOKEN_PATH);

  // Para confirmar el correo de la cuenta autenticada
  oAuth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: oAuth2Client, version: "v2" });
  const userInfo = await oauth2.userinfo.get();
  console.log("👤 Autenticado como:", userInfo.data.email);
}

generateToken().catch((err) => {
  console.error("❌ Error generando token:", err);
});

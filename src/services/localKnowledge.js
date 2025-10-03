import fs from "fs/promises";
import path from "path";
import pdf from "pdf-parse";
import Fuse from "fuse.js";

const dataPath = path.resolve("./data");

async function extraerTextoDePDF(filePath) {
  try {    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (err) {
    console.error("❌ Error al leer PDF:", err.message);
    return null;
  }
}

async function buscarEnPDFs(mensajeUsuario) {
  try {
    // Leer todos los archivos en ./data
    const archivos = await fs.readdir(dataPath);

    // Filtrar solo los PDFs
    const pdfFiles = archivos.filter((f) => f.endsWith(".pdf"));

    let fragmentos = [];

    // Procesar cada PDF
    for (const pdfFile of pdfFiles) {
      const filePath = path.join(dataPath, pdfFile);
      const texto = await extraerTextoDePDF(filePath);

      if (texto) {
        // Cortamos en fragmentos (líneas largas o párrafos)
        const partes = texto
          .split("\n")
          .map((linea, i) => ({
            archivo: pdfFile,
            id: `${pdfFile}-${i}`,
            contenido: linea.trim(),
          }))
          .filter((f) => f.contenido.length > 20);

        fragmentos.push(...partes);
      }
    }

    if (fragmentos.length === 0) {
      return "No se encontró contenido en los PDFs.";
    }

    // Buscar con Fuse en TODOS los PDFs
    const fuse = new Fuse(fragmentos, {
      keys: ["contenido"],
      threshold: 0.3,
    });

    const resultado = fuse.search(mensajeUsuario);

    if (resultado.length > 0) {
      const mejor = resultado[0].item;
      return `📄 Fuente: ${mejor.archivo}\n\n${mejor.contenido}`;
    }

    return "No encontré información relevante en los PDFs.";
  } catch (err) {
    console.error("❌ Error buscando en PDFs:", err.message);
    return null;
  }
}

export default buscarEnPDFs;

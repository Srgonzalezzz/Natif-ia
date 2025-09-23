import express from "express";
import config from "./config/env.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { buscarEnPDFs, indexPDFs } from "./services/pdfIndexer.js";

const app = express();
app.use(express.json());

app.use("/", webhookRoutes);

// Endpoint para forzar reindexado
app.get("/reindex", async (req, res) => {
  await indexPDFs(true);
  res.send("Índice de PDFs actualizado ✅");
});

// Endpoint para buscar en PDFs
app.get("/buscar", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Falta parámetro ?q=" });
  const results = await buscarEnPDFs(q, { limit: 3 });
  res.json(results);
});

app.listen(config.PORT, () => {
  console.log(`Server is listening on port: ${config.PORT}`);
});

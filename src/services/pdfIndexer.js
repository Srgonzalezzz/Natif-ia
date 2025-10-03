// src/services/pdfIndexer.js
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import Fuse from 'fuse.js';

const DATA_DIR = path.resolve('./data');
let fuse = null;
let fragments = [];
let lastIndexedAt = 0;

function chunkText(text, chunkSize = 900, overlap = 250) {
  const out = [];
  let start = 0;
  while (start < text.length) {
    const slice = text.slice(start, Math.min(start + chunkSize, text.length));
    out.push(slice.trim());
    start += chunkSize - overlap;
  }
  return out.filter(Boolean);
}

async function extractText(filePath) {
  const buffer = await fs.readFile(filePath);
  const { text } = await pdfParse(buffer);
  return text || '';
}

export async function indexPDFs(force = false) {
  try {
    const files = await fs.readdir(DATA_DIR);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    if (!force && fuse && (Date.now() - lastIndexedAt < 1000 * 60)) return; // throttle

    fragments = [];
    for (const file of pdfFiles) {
      try {
        const fullPath = path.join(DATA_DIR, file);
        const text = await extractText(fullPath);
        const chunks = chunkText(text);
        chunks.forEach((c, i) => fragments.push({ id: `${file}-${i}`, archivo: file, contenido: c }));
      } catch (err) {
        console.error('pdfIndexer: error reading', file, err.message);
      }
    }

    fuse = new Fuse(fragments, {
      keys: ['contenido'],
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 4
    });

    lastIndexedAt = Date.now();
  } catch (err) {
    console.error('pdfIndexer.indexPDFs error', err.message);
  }
}

export async function buscarEnPDFs(query, opts = { limit: 3 }) {
  if (!fuse) await indexPDFs();
  if (!fuse) return null;
  try {
    const results = fuse.search(query, { limit: opts.limit });
    if (!results || results.length === 0) return null;
    return results.map(r => ({
      origen: 'pdf',
      archivo: r.item.archivo,
      texto: r.item.contenido,
      score: r.score
    }));
  } catch (err) {
    console.error('pdfIndexer.search error', err.message);
    return null;
  }
}

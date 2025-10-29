import fs from "fs";
import path from "path";

/** CORS per etikai.it e www.etikai.it */
function setCORS(req, res) {
  const origin = req.headers.origin || "";
  const ALLOWED = new Set([
    "https://etikai.it",
    "https://www.etikai.it"
  ]);
  if (ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

const logsDir = path.join(process.cwd(), "logs");
const logFile = path.join(logsDir, "metrics.jsonl");

export default async function handler(req, res) {
  try {
    setCORS(req, res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = await readJsonBody(req);
    const rec = {
      ts: new Date().toISOString(),
      ip: (req.headers["x-forwarded-for"] || "anon").split(",")[0].trim(),
      ua: req.headers["user-agent"] || "unknown",
      ...body
    };

    // Nota: su Vercel prod il FS è in sola lettura; proviamo a scrivere e ignoriamo errori
    try {
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
      fs.appendFileSync(logFile, JSON.stringify(rec) + "\n");
    } catch {
      // no-op in prod; eventuale logging su provider esterno in futuro
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("metrics error:", e);
    return res.status(500).json({ error: "Errore salvataggio metriche" });
  }
}

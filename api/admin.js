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

const dialoguesPath = path.join(process.cwd(), "assets", "dialogues.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export default async function handler(req, res) {
  try {
    setCORS(req, res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    if (!ADMIN_PASSWORD) return res.status(500).json({ error: "ADMIN_PASSWORD non configurata" });

    const { password = "", json = "" } = await readJsonBody(req);
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Password errata" });

    let data; try { data = JSON.parse(json); } catch { return res.status(400).json({ error: "JSON non valido" }); }
    if (!data || !Array.isArray(data.categories)) return res.status(400).json({ error: "Struttura JSON non valida (manca categories)" });

    try {
      fs.writeFileSync(dialoguesPath, JSON.stringify(data, null, 2), "utf8");
      return res.json({ ok: true, note: "Salvato su FS. Attenzione: in produzione su Vercel potrebbe non persistere." });
    } catch (e) {
      return res.status(200).json({
        ok: false,
        error: "FS in sola lettura su produzione Vercel. Aggiorna dialogues.json via GitHub o usa storage esterno."
      });
    }
  } catch (e) {
    console.error("admin error:", e);
    return res.status(500).json({ error: "Errore interno" });
  }
}

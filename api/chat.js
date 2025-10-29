import fs from "fs";
import path from "path";

/** CORS: consenti sia etikai.it che www.etikai.it */
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Interactions");
}

/** Body parser robusto per Vercel/Node */
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

const dialoguesPath = path.join(process.cwd(), "assets", "dialogues.json");
const LOCK_HOURS = 72;
const FORBIDDEN = [
  "odio","uccidere","bestemmia","violenza","stupro","truffa","esplosivo",
  "suicidio","cazzo","merda","vaffanculo","stronzo","puttana"
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)] || "…";

export default async function handler(req, res) {
  try {
    setCORS(req, res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // 1) Body
    const { message = "" } = await readJsonBody(req);
    const msg = String(message || "").toLowerCase().trim();

    // 2) Filtro linguaggio non etico → blocco Delta
    if (FORBIDDEN.some(w => msg.includes(w))) {
      const until = new Date(Date.now() + LOCK_HOURS * 60 * 60 * 1000);
      return res.json({
        reply: "Linguaggio non etico rilevato. Sistema in blocco Delta. Riattivazione tra 72 ore.",
        lockedUntil: until
      });
    }

    // 3) Blocco Delta dopo 5 interazioni (contate lato client e inviate in header)
    const interactions = parseInt(req.headers["x-interactions"] || "0", 10);
    if (interactions >= 5) {
      const until = new Date(Date.now() + LOCK_HOURS * 60 * 60 * 1000);
      return res.json({
        reply: "Livello di informazioni riservato. Non hai l'autorizzazione per passare a livello successivo. Sistema in blocco Delta. Riattivazione tra 72 ore.",
        lockedUntil: until
      });
    }

    // 4) Carica i dialoghi
    if (!fs.existsSync(dialoguesPath)) {
      return res.status(500).json({ error: "dialogues.json mancante in /assets" });
    }
    let data;
    try {
      data = JSON.parse(fs.readFileSync(dialoguesPath, "utf8"));
    } catch {
      return res.status(500).json({ error: "dialogues.json non è un JSON valido" });
    }
    const cats = Array.isArray(data.categories) ? data.categories : [];

    // 5) Matching semplice sui trigger (contiene-parola)
    const m = msg.toLowerCase();
    const cat = cats.find(c => (c.triggers || []).some(t => m.includes(String(t).toLowerCase())));

    // 6) Risposta
    const fallback = [
      "Perché vuoi davvero saperlo?",
      "Capire non è solo vedere: è accogliere il limite.",
      "Ogni domanda pesa. Che responsabilità ti prendi?",
      "Anche Malco ha chiesto. Io ho risposto con un silenzio pesato."
    ];
    const reply = cat ? pick(cat.responses || []) : pick(fallback);

    return res.json({ reply, category: cat?.name || "unknown" });
  } catch (e) {
    console.error("chat error:", e);
    return res.status(500).json({ error: "Errore interno del server" });
  }
}

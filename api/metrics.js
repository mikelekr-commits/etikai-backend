import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "logs", "metrics.jsonl");

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const data = req.body || {};
    const entry = {
      ...data,
      ip: req.headers["x-forwarded-for"] || "anon",
      ua: req.headers["user-agent"] || "unknown",
      time: new Date().toISOString(),
    };
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    res.json({ ok: true });
  } catch (err) {
    console.error("Errore metrics:", err);
    res.status(500).json({ error: "Errore salvataggio metriche" });
  }
}
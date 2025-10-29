import fs from "fs";
import path from "path";

const dialoguesPath = path.join(process.cwd(), "assets", "dialogues.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { password, json } = req.body;
    if (password !== ADMIN_PASSWORD)
      return res.status(401).json({ error: "Password non valida" });

    fs.writeFileSync(dialoguesPath, json);
    res.json({ ok: true, msg: "Dialoghi aggiornati correttamente." });
  } catch (err) {
    console.error("Errore admin:", err);
    res.status(500).json({ error: "Errore interno del server" });
  }
}
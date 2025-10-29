import fs from "fs";
import path from "path";

// Percorso al file dei dialoghi
const dialoguesPath = path.join(process.cwd(), "assets", "dialogues.json");

// Funzione per scegliere una risposta casuale
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Tempo di blocco (72 ore)
const LOCK_HOURS = 72;

// Funzione principale (endpoint API)
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message = "" } = req.body || {};
    const msg = message.toLowerCase().trim();

    // Controllo linguaggio inappropriato
    const forbidden = ["odio", "uccidere", "bestemmia", "violenza", "cazzo", "merda"];
    if (forbidden.some((w) => msg.includes(w))) {
      const until = new Date(Date.now() + LOCK_HOURS * 60 * 60 * 1000);
      return res.json({
        reply:
          "Linguaggio non etico rilevato. Sistema in blocco Delta. Riattivazione tra 72 ore.",
        lockedUntil: until,
      });
    }

    // Carica i dialoghi dal file JSON
    const dialogues = JSON.parse(fs.readFileSync(dialoguesPath, "utf-8"));

    // Cerca la categoria che corrisponde ai trigger
    const cat =
      dialogues.categories.find((c) =>
        c.triggers.some((t) => msg.includes(t))
      ) || {
        responses: [
          "Non ho una risposta diretta. Forse dovresti chiederti perché lo stai domandando.",
        ],
      };

    // Risposta casuale
    const reply = pick(cat.responses);

    // Simula il blocco Delta dopo 5 interazioni
    const interactions = parseInt(req.headers["x-interactions"] || "0", 10);
    if (interactions >= 5) {
      const until = new Date(Date.now() + LOCK_HOURS * 60 * 60 * 1000);
      return res.json({
        reply:
          "Livello di informazioni riservato. Sistema in blocco Delta. Riattivazione tra 72 ore.",
        lockedUntil: until,
      });
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Errore chat:", err);
    return res.status(500).json({ error: "Errore interno del server" });
  }
}
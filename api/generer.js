// /api/generer.js — Fonction serverless Vercel
// Génère une leçon (HTML) + un quiz (5 QCM) à partir d'un texte collé par l'admin.
// Nécessite la variable d'environnement ANTHROPIC_API_KEY (Vercel → Settings → Environment Variables).

const FILIERES = {
  f1: "Médecine, Agronomie & Vétérinaire",
  f2: "Sciences administratives, Économie & Génie",
  f3: "Sciences humaines et sociales"
};

// Extrait le texte brut d'un fichier uploadé (PDF ou Word .docx) à partir de son base64.
async function extraireTexteFichier(base64, nomFichier) {
  const buffer = Buffer.from(base64, "base64");
  const ext = (nomFichier.split(".").pop() || "").toLowerCase();

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }
  if (ext === "pdf") {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text || "";
  }
  if (ext === "docx") {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (ext === "doc") {
    const WordExtractor = require("word-extractor");
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return doc.getBody() || "";
  }
  if (ext === "odt") {
    const JSZip = require("jszip");
    const zip = await JSZip.loadAsync(buffer);
    const contentXml = await zip.file("content.xml").async("string");
    // Extraction basique : on isole le texte des balises <text:p> et <text:h>, on vire le reste du XML
    const texte = contentXml
      .replace(/<text:tab[^>]*\/>/g, "\t")
      .replace(/<text:line-break[^>]*\/>/g, "\n")
      .replace(/<\/text:p>|<\/text:h>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return texte;
  }
  throw new Error("Format non supporté (" + ext + "). Utilise PDF, Word (.doc/.docx), ODT ou texte brut.");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const { texte, fichier_base64, fichier_nom, filiere, matiere } = req.body || {};

  let texteSource = texte || "";

  if (fichier_base64 && fichier_nom) {
    try {
      texteSource = await extraireTexteFichier(fichier_base64, fichier_nom);
    } catch (e) {
      res.status(400).json({ error: e.message || "Échec de lecture du fichier." });
      return;
    }
  }

  if (!texteSource || typeof texteSource !== "string" || texteSource.trim().length < 80) {
    res.status(400).json({ error: "Le texte (ou le contenu extrait du fichier) est trop court (minimum ~80 caractères)." });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "Clé ANTHROPIC_API_KEY absente sur le serveur." });
    return;
  }

  const filiereLabel = FILIERES[filiere] || filiere || "";
  const matiereLabel = matiere || "";

  const prompt = `Tu prépares du contenu pédagogique pour "Bientôt Étudiant", une plateforme qui aide des candidats haïtiens à préparer le concours d'entrée à l'université (filière : ${filiereLabel}, matière : ${matiereLabel}).

Voici un texte source fourni par un contributeur :
"""
${texteSource.trim()}
"""

Ta tâche :
- Si le texte est court ou traite d'un seul sujet cohérent, produis UNE SEULE leçon.
- Si le texte est long ou couvre plusieurs sous-thèmes distincts, découpe-le en PLUSIEURS leçons cohérentes (une leçon par sous-thème, ~400 à 900 mots chacune), dans l'ordre logique de progression.

Pour CHAQUE leçon, produis :
1. Un titre, un aperçu (une phrase, max 160 caractères), un contenu HTML simple (balises <h3>, <p>, <ul>/<li>, <b> uniquement — pas de <html>/<body>/<style>, pas de classes CSS).
2. Un quiz de 5 questions à choix multiples (4 choix chacune, une seule bonne réponse) qui teste la compréhension de CETTE leçon précise.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown, au format exact suivant :
{
  "lecons": [
    {
      "titre": "string",
      "apercu": "string",
      "contenu_html": "string",
      "questions": [
        { "enonce": "string", "choix_a": "string", "choix_b": "string", "choix_c": "string", "choix_d": "string", "bonne": "a" }
      ]
    }
  ]
}
Chaque tableau "questions" doit contenir exactement 5 éléments. "bonne" doit être "a", "b", "c" ou "d". Le tableau "lecons" contient 1 élément si le sujet est simple, ou plusieurs si le texte couvre plusieurs sous-thèmes.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      res.status(502).json({ error: (data && data.error && data.error.message) || "Erreur API Claude." });
      return;
    }

    const bloc = (data.content || []).find(c => c.type === "text");
    const brut = bloc ? bloc.text : "";
    const nettoye = brut.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(nettoye);
    } catch (e) {
      res.status(502).json({ error: "Réponse de Claude non structurée, réessaie." });
      return;
    }

    if (!parsed.lecons || !Array.isArray(parsed.lecons) || !parsed.lecons.length) {
      res.status(502).json({ error: "Réponse incomplète de Claude, réessaie." });
      return;
    }
    for (const l of parsed.lecons) {
      if (!l.titre || !l.contenu_html || !Array.isArray(l.questions)) {
        res.status(502).json({ error: "Une leçon générée est incomplète, réessaie." });
        return;
      }
    }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message || "Erreur serveur." });
  }
};

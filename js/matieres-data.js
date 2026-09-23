/* ============================================================
   Données partagées : matières, niveaux, filières, domaines,
   couleurs.
   ------------------------------------------------------------
   Fichier chargé AVANT eleve.js (et donc avant tout autre script
   de page) sur toutes les pages. Il remplace les copies qui
   existaient en double dans admin-quiz.js, admin-lecons.js,
   admin-fiche.js, eleve.js et secondaire.js : une seule source de
   vérité pour ne plus avoir de matières/couleurs désynchronisées.
   ============================================================ */

/* Pré-Fac : matières fixes par filière */
const MATIERES = {
  f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français", "Botanique"],
  f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale", "Économie et Gestion"],
  f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques", "Droit"]
};

const NIVEAUX = { "9e": "4e (9e Fondamentale)", ns1: "3e (NS1)", ns2: "2e (NS2)", ns3: "1ère (NS3)", ns4: "Terminale (NS4)" };

/* Secondaire 9e AF */
const MATIERES_9E_AF = ["Mathématiques", "Français", "Créole", "Anglais", "Espagnol",
  "Sciences Sociales", "Sciences Expérimentales", "Éducation à la Citoyenneté"];

/* Tronc commun NS1/NS2 (S1-S2 du Nouveau Secondaire) — programme MENFP 2024 */
const TRONC_COMMUN = ["Mathématiques", "Français", "Créole", "Anglais", "Espagnol",
  "Histoire-Géographie", "Physique", "Chimie", "Biologie", "Économie",
  "Éducation à la Citoyenneté", "Informatique"];

/* NS3/NS4 : matières par série */
const SERIES_MATIERES = {
  svt: ["Mathématiques", "Physique", "Chimie", "Biologie/Géologie", "Histoire-Géographie", "Philosophie", "Économie", "Informatique", "Anglais", "Espagnol"],
  mp: ["Mathématiques", "Physique", "Chimie", "Histoire-Géographie", "Philosophie", "Économie", "Informatique", "Anglais", "Espagnol"],
  ses: ["Mathématiques", "Économie", "Physique", "Biologie/Géologie", "Histoire-Géographie", "Philosophie", "Informatique", "Anglais", "Espagnol"],
  lla: ["Français", "Anglais", "Espagnol", "Arts", "Mathématiques", "Physique", "Histoire-Géographie", "Philosophie", "Économie"]
};
const NIVEAUX_AVEC_SERIE = ["ns3", "ns4"];

const SERIES_LABELS = {
  svt: "SVT — Sciences de la Vie et de la Terre",
  mp: "MP — Mathématiques et Physique",
  ses: "SES — Sciences Économiques et Sociales",
  lla: "LLA — Lettres, Langues et Arts"
};
const FILIERES_PREFAC_LABELS = {
  f1: "Médecine, Agronomie & Vétérinaire",
  f2: "Sciences administratives, Économie & Génie",
  f3: "Sciences humaines et sociales"
};

/* ------------------------------------------------------------
   Couleur par matière : une classe CSS par matière (voir les
   règles .mat.xxx / .mat-dot.xxx dans style.css, qui portent
   chacune une couleur --m-xxx distincte). Plusieurs libellés de
   matière peuvent pointer vers la même classe quand ils désignent
   la même discipline sous un autre nom.
   ------------------------------------------------------------ */
const MATIERE_CLASSES = {
  "Mathématiques": "math", "Physique": "phys", "Chimie": "chim",
  "Biologie": "bio", "Biologie/Géologie": "biogeo",
  "Français": "fr", "Créole": "creole", "Anglais": "angl", "Espagnol": "esp",
  "Philosophie": "philo", "Histoire-Géographie": "hist",
  "Culture générale": "cg", "Économie": "eco", "Économie et Gestion": "eco",
  "Botanique": "bota", "Droit": "droit", "Informatique": "info",
  "Éducation à la Citoyenneté": "citoy", "Éducation Civique": "citoy",
  "Sciences Sociales": "social", "Sciences Expérimentales": "exp",
  "Sciences Physiques": "phys", "Sciences de la Vie et de la Terre": "biogeo",
  "Arts": "arts", "Art et Musique": "arts"
};
function classeMatiere(nom) { return MATIERE_CLASSES[nom] || "math"; }

/* Couleur de base (hex) d'une matière, en clair — utile partout où
   on a besoin d'un vrai hex (style inline) plutôt que d'une classe CSS. */
const MATIERE_COULEURS = {
  math: "#3b6ea5", phys: "#e07a3c", chim: "#c94f4f", bio: "#3fa06a",
  fr: "#a78bda", philo: "#5b5fc7", hist: "#9c6b42", cg: "#3aa5b0",
  creole: "#d98a4b", eco: "#b8863b", bota: "#5a8f3c", droit: "#6d5a8f",
  angl: "#2f8f7a", esp: "#c76b8a", info: "#4a7fc9", citoy: "#8a6d3f",
  social: "#a87d4f", exp: "#4f9d8f", arts: "#c97fb0", biogeo: "#478a5c"
};
function couleurMatiere(nom) { return MATIERE_COULEURS[classeMatiere(nom)] || MATIERE_COULEURS.math; }

/* ------------------------------------------------------------
   Domaines (sous-catégories) par matière + niveau, avec une nuance
   de la couleur de la matière pour chaque domaine (du plus foncé
   au plus clair). "*" = valable pour tous les niveaux sauf ceux
   listés explicitement.
   ------------------------------------------------------------ */
const DOMAINES_STRUCTURE = {
  "Mathématiques": {
    "9e": [["Algèbre", "#27597c"], ["Géométrie", "#326ba1"], ["Mesures", "#3f7ac3"], ["Applications", "#648cce"]],
    "*": [["Nombres et calculs", "#27597c"], ["Calcul algébrique", "#2b608a"], ["Fonctions", "#2f6797"], ["Géométrie", "#346da5"],
      ["Probabilités", "#3873b3"], ["Statistique", "#3c78c0"], ["Algorithmique et programmation", "#487fc6"],
      ["Logique et raisonnement", "#5685ca"], ["Matrices et graphes", "#648cce"]]
  },
  "Français": { "*": [["Production écrite", "#3b2380"], ["Grammaire", "#542ea5"], ["Orthographe", "#713ac8"], ["Vocabulaire", "#945fd3"]] },
  "Créole": { "*": [["Grammaire et conjugaison", "#7e471b"], ["Orthographe et vocabulaire", "#ab6024"], ["Compréhension de texte", "#d47a32"], ["Expression écrite", "#dd975f"]] },
  "Anglais": { "*": [["Grammar", "#267362"], ["Vocabulary", "#339c85"], ["Reading Comprehension", "#44c2a6"], ["Writing & Speaking", "#6dcfba"]] },
  "Espagnol": { "*": [["Gramática", "#6f2a41"], ["Vocabulario", "#963958"], ["Comprensión escrita", "#bb4b71"], ["Expresión escrita y oral", "#ca7290"]] },
  "Sciences Sociales": { "*": [["Histoire d'Haïti", "#684d31"], ["Histoire du monde", "#8d6942"], ["Géographie", "#b08456"], ["Éducation civique", "#c19f7b"]] },
  "Sciences Expérimentales": { "*": [["Biologie", "#33665d"], ["Physique", "#458a7e"], ["Chimie", "#5aac9d"], ["Sciences de la Terre", "#7ebeb3"]] },
  "Éducation à la Citoyenneté": { "*": [["Droits et devoirs du citoyen", "#695330"], ["Institutions et démocratie", "#8e7041"], ["Valeurs et symboles nationaux", "#b18d55"], ["Environnement et développement durable", "#c2a67a"]] }
};

function domainesPour(matiere, niveau) {
  const table = DOMAINES_STRUCTURE[matiere];
  if (!table) return [];
  return (table[niveau] || table["*"] || []).map(d => d[0]);
}

/* Nuance procédurale de secours : quand la matière n'a pas (encore)
   de domaines curés ci-dessus mais qu'un domaine existe quand même
   en base (saisie libre historique), on calcule une teinte dérivée
   de la couleur de base de la matière plutôt que de retomber sur du
   gris neutre. Déterministe (même domaine -> même nuance à chaque
   appel). */
function nuanceMatiere(matiere, cle) {
  const base = couleurMatiere(matiere);
  const r = parseInt(base.slice(1, 3), 16), g = parseInt(base.slice(3, 5), 16), b = parseInt(base.slice(5, 7), 16);
  let h = 0;
  for (let i = 0; i < (cle || "").length; i++) h = (h * 31 + (cle || "").charCodeAt(i)) >>> 0;
  const pas = [-0.22, -0.08, 0.10, 0.24, 0.36][h % 5];
  const mix = c => {
    const cible = pas < 0 ? 0 : 255;
    return Math.round(c + (cible - c) * Math.abs(pas));
  };
  const hex = n => n.toString(16).padStart(2, "0");
  return "#" + hex(mix(r)) + hex(mix(g)) + hex(mix(b));
}

function couleurDomaine(matiere, niveau, domaine) {
  if (!domaine) return null;
  const table = DOMAINES_STRUCTURE[matiere];
  if (table) {
    const trouve = (table[niveau] || table["*"] || []).find(d => d[0] === domaine);
    if (trouve) return trouve[1];
  }
  return nuanceMatiere(matiere, domaine);
}

/* Liste unique de toutes les matières connues (Pré-Fac + Secondaire,
   tous niveaux/filières/séries confondus), triée alphabétiquement.
   Utilisée pour les sélecteurs qui doivent couvrir toutes les
   matières d'un coup (ex : changement de matière en lot en admin). */
function toutesLesMatieres() {
  const s = new Set();
  Object.values(MATIERES).forEach(l => l.forEach(m => s.add(m)));
  MATIERES_9E_AF.forEach(m => s.add(m));
  TRONC_COMMUN.forEach(m => s.add(m));
  Object.values(SERIES_MATIERES).forEach(l => l.forEach(m => s.add(m)));
  return Array.from(s).sort((a, b) => a.localeCompare(b, "fr"));
}

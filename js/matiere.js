/* Page matière — récupère le nom et l'emoji depuis l'URL */
(function () {
  const params = new URLSearchParams(location.search);
  const m = params.get("m") || "Matière";
  const f = params.get("f") || "";
  const emoji = params.get("e") || "📚";

  const filiereNoms = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };

  document.title = m + " — Bientôt Étudiant";
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  setTxt("mTitre", m);
  setTxt("mBread", m);
  setTxt("mEmoji", emoji);
  setTxt("mFiliere", filiereNoms[f] || "Matière");
})();

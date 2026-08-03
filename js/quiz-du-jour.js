/* ============================================================
   Quiz du jour — page d'accueil
   Sélectionne un quiz publié de façon déterministe (même quiz
   pour tout le monde le même jour), sans appel serveur dédié.
   ============================================================ */
(function () {
  const FILIERES = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };

  function hashJour(txt) {
    let h = 0;
    for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
    return h;
  }

  async function init() {
    const sec = document.getElementById("quizJourSection");
    if (!sec || typeof DB === "undefined" || !DB) return;

    const { data, error } = await DB.from("quiz").select("id, titre, filiere, matiere").eq("publie", true);
    if (error || !data || !data.length) return;

    const jour = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const q = data[hashJour(jour) % data.length];

    const elTitre = document.getElementById("qjTitre");
    const elInfo = document.getElementById("qjInfo");
    const elLien = document.getElementById("qjLien");
    if (elTitre) elTitre.textContent = q.titre;
    if (elInfo) elInfo.textContent = (FILIERES[q.filiere] || q.filiere || "") + " · " + (q.matiere || "");
    if (elLien) elLien.href = "quiz.html?id=" + q.id;

    sec.style.display = "block";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

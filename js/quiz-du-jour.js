/* ============================================================
   Quiz du jour — page d'accueil
   Un quiz différent par filière, sélectionné de façon déterministe
   (même quiz pour tout le monde le même jour, dans chaque filière),
   parmi tous les quiz publiés disponibles pour cette filière.
   Si l'utilisateur est connecté, ne montre que le(s) quiz de SA/ses
   filière(s) ; sinon, montre une carte par filière disponible.
   ============================================================ */
(function () {
  const FILIERES = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  function hashJour(txt) {
    let h = 0;
    for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
    return h;
  }

  async function init() {
    const sec = document.getElementById("quizJourSection");
    const grille = document.getElementById("quizJourGrid");
    if (!sec || !grille || typeof DB === "undefined" || !DB) return;

    let filieresAffichees = ["f1", "f2", "f3"];
    if (typeof eleveActuel === "function") {
      try {
        const el = await eleveActuel();
        if (el && el.nom && el.filieres && el.filieres.length) filieresAffichees = el.filieres;
      } catch (e) { /* invité */ }
    }

    const jour = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { data: tousLesQuiz } = await DB.from("quiz").select("id, titre, filiere, matiere").eq("publie", true);
    if (!tousLesQuiz || !tousLesQuiz.length) return;

    let cartes = "";
    filieresAffichees.forEach(f => {
      const dispo = tousLesQuiz.filter(q => q.filiere === f);
      if (!dispo.length) return;
      const q = dispo[hashJour(jour + f) % dispo.length];
      cartes +=
        '<div class="qj-card">'
        + '<span class="kicker" style="color:var(--ocre)">Quiz du jour · ' + esc(FILIERES[f] || f) + '</span>'
        + '<h3 style="font-family:var(--serif);color:var(--craie);margin:6px 0 8px">' + esc(q.titre) + '</h3>'
        + '<p style="color:rgba(247,244,236,.75)">' + esc(q.matiere) + '</p>'
        + '<a href="quiz.html?id=' + q.id + '" class="btn btn-primary">Faire le quiz <span>→</span></a>'
        + '</div>';
    });

    if (!cartes) return;
    grille.innerHTML = cartes;
    sec.style.display = "block";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

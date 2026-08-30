/* ============================================================
   Quiz du jour — Secondaire.
   Un quiz différent par niveau (4e à Terminale), sélectionné de
   façon déterministe (même quiz pour tout le monde le même jour),
   parmi tous les quiz publiés disponibles pour ce niveau.
   ============================================================ */
(function () {
  const NIVEAUX = {
    "9e": "4e (9e Fondamentale)", ns1: "3e (NS1)", ns2: "2e (NS2)", ns3: "1ère (NS3)", ns4: "Terminale (NS4)"
  };
  const ORDRE_NIVEAUX = ["9e", "ns1", "ns2", "ns3", "ns4"];
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  function hashJour(txt) {
    let h = 0;
    for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0;
    return h;
  }

  async function init() {
    const sec = document.getElementById("quizJourSecSection");
    const grille = document.getElementById("quizJourSecGrid");
    if (!sec || !grille || typeof DB === "undefined" || !DB) return;

    const jour = new Date().toISOString().slice(0, 10);
    const { data: tousLesQuiz } = await DB.from("quiz").select("id, titre, niveau, matiere")
      .eq("publie", true).not("niveau", "is", null);
    if (!tousLesQuiz || !tousLesQuiz.length) return;

    let cartes = "";
    ORDRE_NIVEAUX.forEach(n => {
      const dispo = tousLesQuiz.filter(q => q.niveau === n);
      if (!dispo.length) return;
      const q = dispo[hashJour(jour + n) % dispo.length];
      cartes +=
        '<div class="qj-card">'
        + '<span class="kicker" style="color:var(--ocre)">Quiz du jour · ' + esc(NIVEAUX[n] || n) + '</span>'
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

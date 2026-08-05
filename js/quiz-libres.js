/* ============================================================
   Quiz Libres — liste tous les quiz de type "libre" (dimanche en
   base), groupés par matière. Même règle que l'explorateur
   d'accueil : connecté = uniquement sa/ses filière(s), invité =
   toutes les filières qui ont du contenu.
   ============================================================ */
(function () {
  const zone = document.getElementById("qlZone");
  const filBtns = document.getElementById("qlFiliereBtns");
  if (!zone || !filBtns) return;

  const FILIERES = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  let tousLesQuiz = [];
  let filiereActuelle = null;

  function rendreFiliereBtns(filieresAffichees) {
    filBtns.innerHTML = filieresAffichees.map(f =>
      '<button class="filter' + (f === filiereActuelle ? ' on' : '') + '" data-f="' + f + '">' + esc(FILIERES[f]) + '</button>'
    ).join("");
    filBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      filiereActuelle = b.dataset.f;
      rendreFiliereBtns(filieresAffichees);
      afficher();
    }));
  }

  function afficher() {
    document.body.setAttribute("data-filiere", filiereActuelle);
    const quiz = tousLesQuiz.filter(q => q.filiere === filiereActuelle);
    if (!quiz.length) {
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz Libre pour ' + esc(FILIERES[filiereActuelle]) + '.</p>';
      return;
    }
    const parMatiere = {};
    quiz.forEach(q => { (parMatiere[q.matiere] = parMatiere[q.matiere] || []).push(q); });

    zone.innerHTML = Object.keys(parMatiere).map(m =>
      '<div class="lecons-head" style="margin-top:28px"><h2>' + esc(m) + '</h2></div>'
      + '<div class="lecons-grid">'
      + parMatiere[m].map(q => {
          const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
          return '<a class="lecon-carte quiz-carte libre" href="quiz.html?id=' + q.id + '">'
            + '<span class="lc-num">Quiz Libre</span>'
            + '<h3>' + esc(q.titre) + '</h3>'
            + '<p>' + nbQ + ' questions · ' + Math.round(q.duree_sec / 60) + ' min chronométrées</p>'
            + '<span class="lc-go">Relever le défi →</span></a>';
        }).join("")
      + '</div>'
    ).join("");
  }

  (async function init() {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p style='text-align:center'>Indisponible pour le moment.</p>"; return; }

    const { data } = await DB.from("quiz")
      .select("id, titre, filiere, matiere, duree_sec, questions(count)")
      .eq("publie", true).eq("type", "dimanche")
      .order("created_at", { ascending: false });
    tousLesQuiz = data || [];

    if (!tousLesQuiz.length) {
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz Libre publié. Reviens bientôt !</p>';
      return;
    }

    const filieresDisponibles = ["f1", "f2", "f3"].filter(f => tousLesQuiz.some(q => q.filiere === f));

    let filieresAffichees = filieresDisponibles;
    if (typeof eleveActuel === "function") {
      try {
        const el = await eleveActuel();
        if (el && el.nom && el.filieres && el.filieres.length) filieresAffichees = el.filieres;
      } catch (e) { /* invité */ }
    }
    if (!filieresAffichees.length) filieresAffichees = filieresDisponibles;

    filiereActuelle = filieresAffichees[0];
    rendreFiliereBtns(filieresAffichees);
    afficher();
  })();
})();

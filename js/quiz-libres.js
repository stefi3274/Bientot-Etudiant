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
  const COULEUR_MATIERE = {
    "Mathématiques": "var(--m-math)",
    "Physique": "var(--m-phys)",
    "Chimie": "var(--m-chim)",
    "Biologie": "var(--m-bio)",
    "Botanique": "var(--m-bota)",
    "Français": "var(--m-fr)",
    "Philosophie": "var(--m-philo)",
    "Culture générale": "var(--m-cg)",
    "Créole": "var(--m-creole)",
    "Économie et Gestion": "var(--m-eco)",
    "Droit": "var(--m-droit)"
  };
  const couleurDe = m => COULEUR_MATIERE[m] || "var(--ocre-d)";
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  // Matières transversales : regroupées peu importe la filière dans laquelle elles ont été publiées
  const TRANSVERSALES = ["Français", "Culture générale"];

  let tousLesQuiz = [];
  let filiereActuelle = null;
  let matiereActuelle = null; // null = "Toutes"
  let userId = null;
  let doneQuizIds = new Set();

  function badgeStatut(fait) {
    return userId ? ('<span class="statut-badge ' + (fait ? "fait" : "a-faire") + '">' + (fait ? "✓ Déjà fait" : "À faire") + '</span>') : "";
  }

  function badgeNouveau(createdAt) {
    if (!createdAt) return "";
    const age = Date.now() - new Date(createdAt).getTime();
    return age < 5 * 24 * 60 * 60 * 1000 ? '<span class="badge-nouveau">Nouveau</span>' : "";
  }

  function rendreFiliereBtns(filieresAffichees) {
    filBtns.innerHTML = filieresAffichees.map(f =>
      '<button class="filter' + (f === filiereActuelle ? ' on' : '') + '" data-f="' + f + '">' + esc(FILIERES[f]) + '</button>'
    ).join("");
    filBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      filiereActuelle = b.dataset.f;
      matiereActuelle = null;
      rendreFiliereBtns(filieresAffichees);
      afficher();
    }));
  }

  // Menu matière : uniquement les matières ayant au moins 2 quiz + un bouton "Toutes"
  function rendreMatiereBtns(parMatiere) {
    const matBtns = document.getElementById("qlMatiereBtns");
    if (!matBtns) return;
    const matieresAvecMenu = Object.keys(parMatiere).filter(m => parMatiere[m].length >= 2).sort();
    if (!matieresAvecMenu.length) { matBtns.innerHTML = ""; return; }

    matBtns.innerHTML =
      '<button class="filter' + (matiereActuelle === null ? ' on' : '') + '" data-m="">Toutes</button>'
      + matieresAvecMenu.map(m =>
          '<button class="filter' + (m === matiereActuelle ? ' on' : '') + '" data-m="' + esc(m) + '">' + esc(m) + ' (' + parMatiere[m].length + ')</button>'
        ).join("");
    matBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      matiereActuelle = b.dataset.m || null;
      afficher();
    }));
  }

  function afficher() {
    const quiz = tousLesQuiz.filter(q => q.filiere === filiereActuelle || TRANSVERSALES.includes(q.matiere));
    if (!quiz.length) {
      const matBtns = document.getElementById("qlMatiereBtns");
      if (matBtns) matBtns.innerHTML = "";
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz Libre pour ' + esc(FILIERES[filiereActuelle]) + '.</p>';
      return;
    }
    const parMatiere = {};
    quiz.forEach(q => { (parMatiere[q.matiere] = parMatiere[q.matiere] || []).push(q); });
    rendreMatiereBtns(parMatiere);

    const matieresAAfficher = matiereActuelle ? [matiereActuelle] : Object.keys(parMatiere).sort();

    zone.innerHTML = matieresAAfficher.map(m => {
      const c = couleurDe(m);
      return '<div class="lecons-head" style="margin-top:28px"><h2 style="color:' + c + '">' + esc(m) + '</h2></div>'
      + '<div class="lecons-grid">'
      + parMatiere[m].map(q => {
          const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
          return '<a class="lecon-carte quiz-carte libre" style="border-left-color:' + c + '" href="quiz.html?id=' + q.id + '">'
            + badgeNouveau(q.created_at)
            + badgeStatut(doneQuizIds.has(q.id))
            + '<span class="lc-num" style="color:' + c + '">Quiz Libre</span>'
            + '<h3>' + esc(q.titre) + '</h3>'
            + '<p>' + nbQ + ' questions · ' + Math.round(q.duree_sec / 60) + ' min chronométrées</p>'
            + '<span class="lc-go" style="color:' + c + '">Relever le défi →</span></a>';
        }).join("")
      + '</div>';
    }).join("");
  }

  (async function init() {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p style='text-align:center'>Indisponible pour le moment.</p>"; return; }

    const { data } = await DB.from("quiz")
      .select("id, titre, filiere, matiere, duree_sec, created_at, questions(count)")
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
        if (el && el.nom && el.user_id) {
          userId = el.user_id;
          const { data: tentatives } = await DB.from("tentatives").select("quiz_id").eq("user_id", userId);
          doneQuizIds = new Set((tentatives || []).map(t => t.quiz_id));
        }
      } catch (e) { /* invité */ }
    }
    if (!filieresAffichees.length) filieresAffichees = filieresDisponibles;

    filiereActuelle = filieresAffichees[0];
    rendreFiliereBtns(filieresAffichees);
    afficher();
  })();
})();

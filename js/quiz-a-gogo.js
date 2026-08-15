/* ============================================================
   Quiz à Gogo — catégorie dédiée (type "gogo" en base), remplie
   par l'admin matière par matière, 10 questions chacun. Parcours
   par filière puis matière (colorée, comme Quiz Libres). Cliquer
   un quiz démarre la chaîne (via quiz.html?gogo=1) qui enchaîne
   ensuite sur un autre quiz "gogo" de la même matière.
   Limite glissante 24h gérée dans quiz.js : 2 sans compte, 5 connecté.
   ============================================================ */
(function () {
  const zone = document.getElementById("gogoZone");
  const filBtns = document.getElementById("gogoFiliereBtns");
  const matBtns = document.getElementById("gogoMatiereBtns");
  if (!zone || !filBtns) return;

  const FILIERES = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };
  const FILIERES_COULEUR = { f1: "var(--f1)", f2: "var(--f2)", f3: "var(--f3)" };
  const COULEUR_MATIERE = {
    "Mathématiques": "var(--m-math)", "Physique": "var(--m-phys)", "Chimie": "var(--m-chim)",
    "Biologie": "var(--m-bio)", "Botanique": "var(--m-bota)", "Français": "var(--m-fr)",
    "Philosophie": "var(--m-philo)", "Culture générale": "var(--m-cg)", "Créole": "var(--m-creole)",
    "Économie et Gestion": "var(--m-eco)", "Droit": "var(--m-droit)"
  };
  const couleurDe = m => COULEUR_MATIERE[m] || "var(--ocre-d)";
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  function lireTableau(cle) {
    try { return JSON.parse(localStorage.getItem(cle) || "[]"); } catch (e) { return []; }
  }
  function compterGogoLocal() {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    return lireTableau("bq_hist_gogo").filter(r => r.ts > limite).length;
  }

  let tousLesGogo = [];
  let filiereActuelle = null;
  let matiereActuelle = null;
  let connecte = null;

  function rendreFiliereBtns(filieresAffichees) {
    filBtns.innerHTML = filieresAffichees.map(f => {
      const on = f === filiereActuelle;
      const c = FILIERES_COULEUR[f];
      return '<button class="filter' + (on ? ' on' : '') + '" data-f="' + f + '"'
        + (on ? ' style="background:' + c + ';border-color:' + c + '"' : '')
        + '>' + esc(FILIERES[f]) + '</button>';
    }).join("");
    filBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      filiereActuelle = b.dataset.f;
      matiereActuelle = null;
      rendreFiliereBtns(filieresAffichees);
      majMatieres();
    }));
  }

  function majMatieres() {
    const quiz = tousLesGogo.filter(q => q.filiere === filiereActuelle);
    const parMatiere = {};
    quiz.forEach(q => { (parMatiere[q.matiere] = parMatiere[q.matiere] || []).push(q); });
    const matieres = Object.keys(parMatiere).sort();

    if (!matieres.length) {
      matBtns.innerHTML = "";
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz à Gogo pour ' + esc(FILIERES[filiereActuelle]) + '.</p>';
      return;
    }

    matBtns.innerHTML = matieres.map((m, i) => {
      const c = couleurDe(m);
      return '<button class="filter' + (i === 0 ? ' on' : '') + '" data-m="' + esc(m) + '" style="' + (i===0?('background:'+c+';border-color:'+c+';color:#fff'):'') + '">' + esc(m) + ' (' + parMatiere[m].length + ')</button>';
    }).join("");
    matiereActuelle = matieres[0];
    matBtns.querySelectorAll(".filter").forEach((b, i) => {
      b.addEventListener("click", () => {
        matBtns.querySelectorAll(".filter").forEach(x => { x.classList.remove("on"); x.style.background = ""; x.style.borderColor = ""; x.style.color = ""; });
        b.classList.add("on");
        const c = couleurDe(b.dataset.m);
        b.style.background = c; b.style.borderColor = c; b.style.color = "#fff";
        matiereActuelle = b.dataset.m;
        afficherListe(parMatiere[matiereActuelle]);
      });
    });
    afficherListe(parMatiere[matiereActuelle]);
  }

  function afficherListe(liste) {
    const c = couleurDe(matiereActuelle);
    const limite = connecte ? 5 : 2;
    const deja = compterGogoLocal();
    const restants = Math.max(0, limite - deja);

    const entete = '<p style="text-align:center;color:var(--encre-2);margin-bottom:18px">'
      + (restants > 0
          ? restants + ' quiz "à gogo" restant' + (restants > 1 ? "s" : "") + ' aujourd\'hui — choisis-en un pour démarrer, les suivants s\'enchaînent automatiquement.'
          : (connecte ? 'Tu as atteint la limite du jour (5/5). Reviens demain !' : 'Tu as atteint la limite du jour sans compte (2/2). Crée un compte pour continuer jusqu\'à 5 par jour.'))
      + '</p>';

    zone.innerHTML = entete + '<div class="lecons-grid">'
      + liste.map(q => {
          const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
          return '<a class="lecon-carte quiz-carte libre" style="border-left-color:' + c + '" href="quiz.html?id=' + q.id + '&gogo=1">'
            + '<span class="lc-num" style="color:' + c + '">Quiz à Gogo</span>'
            + '<h3>' + esc(q.titre) + '</h3>'
            + '<p>' + nbQ + ' questions</p>'
            + '<span class="lc-go" style="color:' + c + '">Commencer →</span></a>';
        }).join("")
      + '</div>';
  }

  (async function init() {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p class='empty'>Indisponible pour le moment.</p>"; return; }

    const { data } = await DB.from("quiz")
      .select("id, titre, filiere, matiere, questions(count)")
      .eq("publie", true).eq("type", "gogo")
      .order("created_at", { ascending: false });
    tousLesGogo = data || [];

    if (!tousLesGogo.length) {
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz à Gogo publié. Reviens bientôt !</p>';
      return;
    }

    const filieresDisponibles = ["f1", "f2", "f3"].filter(f => tousLesGogo.some(q => q.filiere === f));
    let filieresAffichees = filieresDisponibles;

    if (typeof eleveActuel === "function") {
      try {
        const el = await eleveActuel();
        if (el && el.nom) {
          connecte = el;
          if (el.filieres && el.filieres.length) filieresAffichees = el.filieres.filter(f => filieresDisponibles.includes(f));
        }
      } catch (e) { /* invité */ }
    }
    if (!filieresAffichees.length) filieresAffichees = filieresDisponibles;

    filiereActuelle = filieresAffichees[0];
    rendreFiliereBtns(filieresAffichees);
    majMatieres();
  })();
})();

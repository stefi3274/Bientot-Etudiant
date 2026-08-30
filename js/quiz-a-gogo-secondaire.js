/* ============================================================
   Quiz à Gogo — Secondaire (type "gogo" en base, niveau au lieu
   de filière). Parcours : niveau -> (série si NS3/NS4) -> matière.
   Cliquer un quiz démarre la chaîne (quiz.html?gogo=1).
   Limite glissante 24h gérée dans quiz.js : 2 sans compte, 5 connecté.
   ============================================================ */
(function () {
  const zone = document.getElementById("gogoSecZone");
  const niveauBtns = document.getElementById("gogoSecNiveauBtns");
  const serieBtns = document.getElementById("gogoSecSerieBtns");
  const matBtns = document.getElementById("gogoSecMatiereBtns");
  if (!zone || !niveauBtns) return;

  const NIVEAUX = {
    "9e": "4e (9e Fondamentale)", ns1: "3e (NS1)", ns2: "2e (NS2)", ns3: "1ère (NS3)", ns4: "Terminale (NS4)"
  };
  const ORDRE_NIVEAUX = ["9e", "ns1", "ns2", "ns3", "ns4"];
  const NIVEAU_COULEUR = { "9e": "var(--niv-9e)", ns1: "var(--niv-ns1)", ns2: "var(--niv-ns2)", ns3: "var(--niv-ns3)", ns4: "var(--niv-ns4)" };
  const NIVEAUX_AVEC_SERIE = ["ns3", "ns4"];
  const SERIES = { svt: "SVT", smp: "SMP", ses: "SES", lla: "LLA" };
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
  let niveauActuel = null, serieActuelle = null, matiereActuelle = null;
  let connecte = null;

  function rendreNiveauBtns(niveauxDisponibles) {
    niveauBtns.innerHTML = niveauxDisponibles.map(n => {
      const on = n === niveauActuel;
      const c = NIVEAU_COULEUR[n];
      return '<button class="filter' + (on ? ' on' : '') + '" data-n="' + n + '"'
        + (on ? ' style="background:' + c + ';border-color:' + c + '"' : '')
        + '>' + esc(NIVEAUX[n]) + '</button>';
    }).join("");
    niveauBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      niveauActuel = b.dataset.n;
      serieActuelle = null; matiereActuelle = null;
      rendreNiveauBtns(niveauxDisponibles);
      ouvrirNiveau();
    }));
  }

  function ouvrirNiveau() {
    if (NIVEAUX_AVEC_SERIE.includes(niveauActuel)) {
      const seriesDispo = Object.keys(SERIES).filter(s =>
        tousLesGogo.some(q => q.niveau === niveauActuel && q.filiere === s));
      if (!seriesDispo.length) {
        serieBtns.innerHTML = ""; matBtns.innerHTML = "";
        zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz à Gogo pour ' + esc(NIVEAUX[niveauActuel]) + '.</p>';
        return;
      }
      serieBtns.innerHTML = seriesDispo.map((s, i) => {
        const on = i === 0;
        return '<button class="filter' + (on ? ' on' : '') + '" data-s="' + s + '"'
          + (on ? ' style="background:var(--ardoise);border-color:var(--ardoise)"' : '')
          + '>' + esc(SERIES[s]) + '</button>';
      }).join("");
      serieActuelle = seriesDispo[0];
      serieBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
        serieBtns.querySelectorAll(".filter").forEach(x => { x.classList.remove("on"); x.style.background = ""; x.style.borderColor = ""; });
        b.classList.add("on"); b.style.background = "var(--ardoise)"; b.style.borderColor = "var(--ardoise)";
        serieActuelle = b.dataset.s;
        majMatieres();
      }));
      majMatieres();
    } else {
      serieBtns.innerHTML = "";
      serieActuelle = null;
      majMatieres();
    }
  }

  function majMatieres() {
    const avecSerie = NIVEAUX_AVEC_SERIE.includes(niveauActuel);
    const quiz = tousLesGogo.filter(q => q.niveau === niveauActuel && (!avecSerie || q.filiere === serieActuelle));
    const parMatiere = {};
    quiz.forEach(q => { (parMatiere[q.matiere] = parMatiere[q.matiere] || []).push(q); });
    const matieres = Object.keys(parMatiere).sort();

    if (!matieres.length) {
      matBtns.innerHTML = "";
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz à Gogo ici.</p>';
      return;
    }

    matBtns.innerHTML = matieres.map((m, i) => {
      const on = i === 0;
      return '<button class="filter' + (on ? ' on' : '') + '" data-m="' + esc(m) + '"'
        + (on ? ' style="background:var(--ocre-d);border-color:var(--ocre-d);color:#fff"' : '')
        + '>' + esc(m) + ' (' + parMatiere[m].length + ')</button>';
    }).join("");
    matiereActuelle = matieres[0];
    matBtns.querySelectorAll(".filter").forEach(b => {
      b.addEventListener("click", () => {
        matBtns.querySelectorAll(".filter").forEach(x => { x.classList.remove("on"); x.style.background = ""; x.style.borderColor = ""; x.style.color = ""; });
        b.classList.add("on");
        b.style.background = "var(--ocre-d)"; b.style.borderColor = "var(--ocre-d)"; b.style.color = "#fff";
        matiereActuelle = b.dataset.m;
        afficherListe(parMatiere[matiereActuelle]);
      });
    });
    afficherListe(parMatiere[matiereActuelle]);
  }

  function afficherListe(liste) {
    const c = "var(--ocre-d)";
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
      .select("id, titre, niveau, filiere, matiere, questions(count)")
      .eq("publie", true).eq("type", "gogo").not("niveau", "is", null)
      .order("created_at", { ascending: false });
    tousLesGogo = data || [];

    if (!tousLesGogo.length) {
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de Quiz à Gogo publié pour le Secondaire. Reviens bientôt !</p>';
      return;
    }

    const niveauxDisponibles = ORDRE_NIVEAUX.filter(n => tousLesGogo.some(q => q.niveau === n));
    niveauActuel = niveauxDisponibles[0];
    rendreNiveauBtns(niveauxDisponibles);
    ouvrirNiveau();
  })();
})();

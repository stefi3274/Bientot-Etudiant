/* ============================================================
   Page Secondaire — niveau (4e à Terminale), puis :
   - pour 9e/NS1/NS2 : matière (tronc commun, pas de filière)
   - pour NS3/NS4 : série (SVT/SMP/SES/LLA) -> matière fixe
   Puis affichage des leçons/quiz.
   ============================================================ */
(function () {
  const niveauBtns = document.getElementById("secNiveauBtns");
  const serieBtns = document.getElementById("secSerieBtns");
  const matBtns = document.getElementById("secMatiereBtns");
  const zone = document.getElementById("secZone");
  if (!niveauBtns || !zone) return;

  const NIVEAUX = {
    "9e": "4e (9e Fondamentale)",
    ns1: "3e (NS1)",
    ns2: "2e (NS2)",
    ns3: "1ère (NS3)",
    ns4: "Terminale (NS4)"
  };
  const ORDRE_NIVEAUX = ["9e", "ns1", "ns2", "ns3", "ns4"];
  const NIVEAU_COULEUR = { "9e": "var(--niv-9e)", ns1: "var(--niv-ns1)", ns2: "var(--niv-ns2)", ns3: "var(--niv-ns3)", ns4: "var(--niv-ns4)" };
  const NIVEAUX_AVEC_SERIE = ["ns3", "ns4"];
  const SERIES = { svt: "SVT — Sciences de la Vie et de la Terre", smp: "SMP — Sciences, Mathématiques, Physique",
    ses: "SES — Sciences Économiques et Sociales", lla: "LLA — Lettres, Langues et Arts" };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  let lecons = [], quiz = [];
  let niveauActuel = null, serieActuelle = null, matiereActuelle = null;

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
      document.body.setAttribute("data-niveau", niveauActuel);
      ouvrirNiveau();
    }));
  }

  // Selon le niveau : soit direct aux matières (tronc commun), soit d'abord la série (NS3/NS4)
  function ouvrirNiveau() {
    if (NIVEAUX_AVEC_SERIE.includes(niveauActuel)) {
      const seriesDispo = Object.keys(SERIES).filter(s =>
        lecons.some(l => l.niveau === niveauActuel && l.filiere === s) ||
        quiz.some(q => q.niveau === niveauActuel && q.filiere === s));
      if (!seriesDispo.length) {
        serieBtns.innerHTML = ""; matBtns.innerHTML = "";
        zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de contenu publié pour ' + esc(NIVEAUX[niveauActuel]) + '. Reviens bientôt !</p>';
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
    const lC = lecons.filter(l => l.niveau === niveauActuel && (!avecSerie || l.filiere === serieActuelle));
    const qC = quiz.filter(q => q.niveau === niveauActuel && (!avecSerie || q.filiere === serieActuelle));
    const matieres = [...new Set([...lC.map(l => l.matiere), ...qC.map(q => q.matiere)])].sort();

    if (!matieres.length) {
      matBtns.innerHTML = "";
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de contenu publié ici. Reviens bientôt !</p>';
      return;
    }

    matBtns.innerHTML = matieres.map((m, i) => {
      const on = i === 0;
      return '<button class="filter' + (on ? ' on' : '') + '" data-m="' + esc(m) + '"'
        + (on ? ' style="background:var(--ocre-d);border-color:var(--ocre-d);color:#fff"' : '')
        + '>' + esc(m) + '</button>';
    }).join("");
    matiereActuelle = matieres[0];
    matBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      matBtns.querySelectorAll(".filter").forEach(x => { x.classList.remove("on"); x.style.background = ""; x.style.borderColor = ""; x.style.color = ""; });
      b.classList.add("on");
      b.style.background = "var(--ocre-d)"; b.style.borderColor = "var(--ocre-d)"; b.style.color = "#fff";
      matiereActuelle = b.dataset.m;
      afficherContenu();
    }));
    afficherContenu();
  }

  function afficherContenu() {
    const avecSerie = NIVEAUX_AVEC_SERIE.includes(niveauActuel);
    const lC = lecons.filter(l => l.niveau === niveauActuel && l.matiere === matiereActuelle && (!avecSerie || l.filiere === serieActuelle));
    const qC = quiz.filter(q => q.niveau === niveauActuel && q.matiere === matiereActuelle && (!avecSerie || q.filiere === serieActuelle));

    const carteLecon = l =>
      '<a class="lecon-carte" href="lecon.html?id=' + l.id + '">'
      + '<span class="lc-num">Leçon ' + (l.ordre || 1) + '</span>'
      + '<h3>' + esc(l.titre) + '</h3>'
      + (l.apercu ? '<p>' + esc(l.apercu) + '</p>' : '')
      + '<span class="lc-go">Lire la leçon →</span></a>';

    const carteQuiz = q => {
      const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
      const estDim = q.type === "dimanche";
      return '<a class="lecon-carte quiz-carte' + (estDim ? ' libre' : '') + '" href="quiz.html?id=' + q.id + '">'
        + '<span class="lc-num">' + (estDim ? "Quiz Libre" : "Quiz") + '</span>'
        + '<h3>' + esc(q.titre) + '</h3>'
        + '<p>' + nbQ + ' questions · ' + Math.round(q.duree_sec / 60) + ' min chronométrées</p>'
        + '<span class="lc-go">Relever le défi →</span></a>';
    };

    if (!lC.length && !qC.length) {
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Pas encore de contenu pour cette matière.</p>';
      return;
    }

    let html = "";
    if (lC.length) {
      html += '<div class="lecons-head"><h2>' + lC.length + (lC.length > 1 ? " leçons" : " leçon") + '</h2></div>'
        + '<div class="lecons-grid">' + lC.map(carteLecon).join("") + '</div>';
    }
    if (qC.length) {
      html += '<div class="lecons-head" style="margin-top:32px"><h2>' + qC.length + " quiz" + '</h2></div>'
        + '<div class="lecons-grid">' + qC.map(carteQuiz).join("") + '</div>';
    }
    zone.innerHTML = html;
  }

  (async function init() {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p class='empty'>Indisponible pour le moment.</p>"; return; }

    const [{ data: leconsData }, { data: quizData }] = await Promise.all([
      DB.from("lecons").select("id, titre, apercu, ordre, niveau, filiere, matiere").eq("publie", true).not("niveau", "is", null),
      DB.from("quiz").select("id, titre, duree_sec, type, niveau, filiere, matiere, questions(count)").eq("publie", true).not("niveau", "is", null)
    ]);
    lecons = leconsData || [];
    quiz = quizData || [];

    const niveauxAvecContenu = ORDRE_NIVEAUX.filter(n =>
      lecons.some(l => l.niveau === n) || quiz.some(q => q.niveau === n));

    if (!niveauxAvecContenu.length) {
      niveauBtns.innerHTML = "";
      zone.innerHTML = '<p class="empty" style="text-align:center;color:var(--encre-2)">Le contenu du secondaire arrive bientôt !</p>';
      return;
    }

    niveauActuel = niveauxAvecContenu[0];
    document.body.setAttribute("data-niveau", niveauActuel);
    rendreNiveauBtns(niveauxAvecContenu);
    ouvrirNiveau();
  })();
})();

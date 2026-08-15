/* ============================================================
   Page d'accueil — explorer les leçons et quiz par filière/matière.
   - N'affiche que les filières/matières qui ont déjà du contenu publié.
   - Si l'utilisateur est connecté, ne montre que SA (ses) filière(s).
   ============================================================ */
(function () {
  const zone = document.getElementById("expZone");
  if (!zone) return;

  const FILIERES = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };
  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français", "Botanique"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale", "Économie et Gestion"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques", "Droit"]
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

  // Matières transversales : visibles/accessibles depuis n'importe quelle filière,
  // tout leur contenu est regroupé peu importe sous quelle filière il a été publié.
  const TRANSVERSALES = ["Français", "Culture générale"];

  const filBtns = document.getElementById("expFiliereBtns");
  const matBtns = document.getElementById("expMatiereBtns");
  const labelFil = document.getElementById("expFiliereLabel");

  let disponibles = {};   // { f1: Set(matières disponibles), f2: Set(...), f3: Set(...) }
  let filieresAffichees = ["f1", "f2", "f3"];
  let filiereActuelle = null, matiereActuelle = null;
  let userId = null;
  let doneQuizIds = new Set(), doneLeconIds = new Set();

  async function chargerStatuts(uid) {
    const [{ data: tentatives }, { data: vues }] = await Promise.all([
      DB.from("tentatives").select("quiz_id").eq("user_id", uid),
      DB.from("lecons_vues").select("lecon_id").eq("user_id", uid)
    ]);
    doneQuizIds = new Set((tentatives || []).map(t => t.quiz_id));
    doneLeconIds = new Set((vues || []).map(v => v.lecon_id));
  }

  function badgeStatut(fait) {
    return userId ? ('<span class="statut-badge ' + (fait ? "fait" : "a-faire") + '">' + (fait ? "✓ Déjà fait" : "À faire") + '</span>') : "";
  }

  // "Nouveau" si publié il y a moins de 5 jours — visible de tous, invités compris
  function badgeNouveau(createdAt) {
    if (!createdAt) return "";
    const age = Date.now() - new Date(createdAt).getTime();
    return age < 5 * 24 * 60 * 60 * 1000 ? '<span class="badge-nouveau">Nouveau</span>' : "";
  }

  async function chargerDisponibilites() {
    if (typeof DB === "undefined" || !DB) return;
    const [{ data: lecons }, { data: quiz }] = await Promise.all([
      DB.from("lecons").select("filiere, matiere").eq("publie", true),
      DB.from("quiz").select("filiere, matiere").eq("publie", true)
    ]);
    disponibles = { f1: new Set(), f2: new Set(), f3: new Set() };
    (lecons || []).forEach(l => { if (disponibles[l.filiere]) disponibles[l.filiere].add(l.matiere); });
    (quiz || []).forEach(q => { if (disponibles[q.filiere]) disponibles[q.filiere].add(q.matiere); });

    // Une matière transversale ayant du contenu QUELQUE PART devient disponible PARTOUT
    TRANSVERSALES.forEach(m => {
      const presentePart = Object.values(disponibles).some(set => set.has(m));
      if (presentePart) Object.keys(disponibles).forEach(f => disponibles[f].add(m));
    });
  }

  function filieresAvecContenu() {
    return ["f1", "f2", "f3"].filter(f => disponibles[f] && disponibles[f].size > 0);
  }

  function rendreFiliereBtns() {
    filBtns.innerHTML = filieresAffichees.map((f, i) => {
      const on = f === filiereActuelle;
      const c = FILIERES_COULEUR[f];
      return '<button class="filter' + (on ? ' on' : '') + '" data-f="' + f + '"'
        + (on ? ' style="background:' + c + ';border-color:' + c + '"' : '')
        + '>' + esc(FILIERES[f]) + '</button>';
    }).join("");
    filBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      filiereActuelle = b.dataset.f;
      rendreFiliereBtns();
      majMatieres();
    }));
  }

  function majMatieres() {
    document.body.setAttribute("data-filiere", filiereActuelle);
    labelFil.textContent = FILIERES[filiereActuelle] || "";

    const dispo = disponibles[filiereActuelle] || new Set();
    const matieresDisponibles = (MATIERES[filiereActuelle] || []).filter(m => dispo.has(m));

    if (!matieresDisponibles.length) {
      matBtns.innerHTML = "";
      zone.innerHTML = '<p class="exp-empty">Pas encore de contenu publié pour ' + esc(FILIERES[filiereActuelle]) + '. Reviens bientôt !</p>';
      return;
    }

    matBtns.innerHTML = matieresDisponibles.map((m, i) => {
      const c = couleurDe(m);
      return '<button class="filter' + (i === 0 ? ' on' : '') + '" data-m="' + esc(m) + '"'
        + (i === 0 ? ' style="background:' + c + ';border-color:' + c + ';color:#fff"' : '')
        + '>' + esc(m) + '</button>';
    }).join("");
    matiereActuelle = matieresDisponibles[0];
    matBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      matBtns.querySelectorAll(".filter").forEach(x => { x.classList.remove("on"); x.style.background = ""; x.style.borderColor = ""; x.style.color = ""; });
      b.classList.add("on");
      const c = couleurDe(b.dataset.m);
      b.style.background = c; b.style.borderColor = c; b.style.color = "#fff";
      matiereActuelle = b.dataset.m;
      charger();
    }));
    charger();
  }

  async function charger() {
    if (!matiereActuelle || typeof DB === "undefined" || !DB) return;
    zone.innerHTML = '<p class="exp-empty">Chargement…</p>';

    const transversale = TRANSVERSALES.includes(matiereActuelle);

    let qLecons = DB.from("lecons").select("id, titre, apercu, ordre, filiere, created_at").eq("matiere", matiereActuelle).eq("publie", true);
    let qQuiz = DB.from("quiz").select("id, titre, duree_sec, type, filiere, created_at, questions(count)").eq("matiere", matiereActuelle).eq("publie", true);
    if (!transversale) { qLecons = qLecons.eq("filiere", filiereActuelle); qQuiz = qQuiz.eq("filiere", filiereActuelle); }

    const { data: lecons } = await qLecons.order("ordre", { ascending: true });
    const { data: quiz } = await qQuiz.order("created_at", { ascending: false });

    if ((!lecons || !lecons.length) && (!quiz || !quiz.length)) {
      zone.innerHTML = '<p class="exp-empty">Pas encore de contenu pour ' + esc(matiereActuelle) + '.</p>';
      return;
    }

    let html = "";
    if (lecons && lecons.length) {
      html += '<div class="lecons-head"><h2>' + lecons.length + (lecons.length > 1 ? " leçons" : " leçon") + '</h2></div>'
        + '<div class="lecons-grid">'
        + lecons.map(l =>
            '<a class="lecon-carte" href="lecon.html?id=' + l.id + '">'
            + badgeNouveau(l.created_at)
            + badgeStatut(doneLeconIds.has(l.id))
            + '<span class="lc-num">Leçon ' + (l.ordre || 1) + '</span>'
            + '<h3>' + esc(l.titre) + '</h3>'
            + (l.apercu ? '<p>' + esc(l.apercu) + '</p>' : '')
            + '<span class="lc-go">Lire la leçon →</span></a>'
          ).join("")
        + '</div>';
    }
    if (quiz && quiz.length) {
      html += '<div class="lecons-head" style="margin-top:32px"><h2>' + quiz.length + " quiz" + '</h2></div>'
        + '<div class="lecons-grid">'
        + quiz.map(q => {
            const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
            const estDimanche = q.type === "dimanche";
            return '<a class="lecon-carte quiz-carte' + (estDimanche ? ' libre' : '') + '" href="quiz.html?id=' + q.id + '">'
              + badgeNouveau(q.created_at)
              + badgeStatut(doneQuizIds.has(q.id))
              + '<span class="lc-num">' + (estDimanche ? "Quiz Libre" : "Quiz") + '</span>'
              + '<h3>' + esc(q.titre) + '</h3>'
              + '<p>' + nbQ + ' questions · ' + Math.round(q.duree_sec/60) + ' min chronométrées</p>'
              + '<span class="lc-go">Relever le défi →</span></a>';
          }).join("")
        + '</div>';
    }
    zone.innerHTML = html;
  }

  (async function init() {
    await chargerDisponibilites();
    const avecContenu = filieresAvecContenu();

    let filieresEtudiant = null;
    if (typeof eleveActuel === "function") {
      try {
        const el = await eleveActuel();
        if (el && el.nom && el.filieres && el.filieres.length) filieresEtudiant = el.filieres;
        if (el && el.nom && el.user_id) { userId = el.user_id; await chargerStatuts(userId); }
      } catch (e) { /* pas connecté ou erreur silencieuse */ }
    }

    if (filieresEtudiant) {
      // Connecté : uniquement SA/ses filière(s)
      filieresAffichees = filieresEtudiant;
    } else {
      // Invité : uniquement les filières qui ont du contenu (repli sur les 3 si aucune n'a encore de contenu)
      filieresAffichees = avecContenu.length ? avecContenu : ["f1", "f2", "f3"];
    }

    filiereActuelle = filieresAffichees[0];
    rendreFiliereBtns();
    majMatieres();

    if (userId) chargerReprise();
  })();

  // "Reprendre où tu t'es arrêté" — dernière leçon lue, sinon dernier quiz passé
  async function chargerReprise() {
    const section = document.getElementById("repriseSection");
    const zone = document.getElementById("repriseZone");
    if (!section || !zone) return;

    const { data: derniereLecon } = await DB.from("lecons_vues")
      .select("lecon_id, created_at, lecons(id, titre, matiere, filiere)")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (derniereLecon && derniereLecon.lecons) {
      const l = derniereLecon.lecons;
      section.style.display = "block";
      zone.innerHTML =
        '<a class="reprise-carte" href="lecon.html?id=' + l.id + '">'
        + '<span class="reprise-kick">Reprendre où tu t\'es arrêté.e</span>'
        + '<h3>' + esc(l.titre) + '</h3>'
        + '<span class="reprise-meta">' + esc(l.matiere) + '</span>'
        + '<span class="btn btn-dark btn-pulse">Continuer <span>→</span></span>'
        + '</a>';
      return;
    }

    // Repli : dernière tentative de quiz
    const { data: derniereTentative } = await DB.from("tentatives")
      .select("quiz_id, matiere, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (derniereTentative && derniereTentative.quiz_id) {
      section.style.display = "block";
      zone.innerHTML =
        '<a class="reprise-carte" href="quiz.html?id=' + derniereTentative.quiz_id + '">'
        + '<span class="reprise-kick">Continue sur ta lancée</span>'
        + '<h3>Refaire un quiz de ' + esc(derniereTentative.matiere) + '</h3>'
        + '<span class="btn btn-dark btn-pulse">Continuer <span>→</span></span>'
        + '</a>';
    }
  }
})();

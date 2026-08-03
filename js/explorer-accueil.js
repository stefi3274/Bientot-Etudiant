/* ============================================================
   Page d'accueil — explorer les leçons et quiz par filière/matière
   directement sur l'accueil, sans changer de page.
   ============================================================ */
(function () {
  const zone = document.getElementById("expZone");
  if (!zone) return;

  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques"]
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const filBtns = document.getElementById("expFiliereBtns");
  const matBtns = document.getElementById("expMatiereBtns");
  let filiereActuelle = "f1", matiereActuelle = null;

  function majMatieres() {
    document.body.setAttribute("data-filiere", filiereActuelle);
    matBtns.innerHTML = (MATIERES[filiereActuelle] || []).map((m, i) =>
      '<button class="filter' + (i === 0 ? ' on' : '') + '" data-m="' + esc(m) + '">' + esc(m) + '</button>'
    ).join("");
    matiereActuelle = (MATIERES[filiereActuelle] || [])[0] || null;
    matBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
      matBtns.querySelectorAll(".filter").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      matiereActuelle = b.dataset.m;
      charger();
    }));
    charger();
  }

  filBtns.querySelectorAll(".filter").forEach(b => b.addEventListener("click", () => {
    filBtns.querySelectorAll(".filter").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    filiereActuelle = b.dataset.f;
    majMatieres();
  }));

  async function charger() {
    if (!matiereActuelle) return;
    if (typeof DB === "undefined" || !DB) return;
    zone.innerHTML = '<p class="exp-empty">Chargement…</p>';

    const { data: lecons } = await DB.from("lecons")
      .select("id, titre, apercu, ordre")
      .eq("filiere", filiereActuelle).eq("matiere", matiereActuelle).eq("publie", true)
      .order("ordre", { ascending: true });

    const { data: quiz } = await DB.from("quiz")
      .select("id, titre, duree_sec, type, questions(count)")
      .eq("filiere", filiereActuelle).eq("matiere", matiereActuelle).eq("publie", true)
      .order("created_at", { ascending: false });

    if ((!lecons || !lecons.length) && (!quiz || !quiz.length)) {
      zone.innerHTML = '<p class="exp-empty">Pas encore de contenu pour ' + esc(matiereActuelle) + '. Reviens bientôt !</p>';
      return;
    }

    let html = "";
    if (lecons && lecons.length) {
      html += '<div class="lecons-head"><h2>' + lecons.length + (lecons.length > 1 ? " leçons" : " leçon") + '</h2></div>'
        + '<div class="lecons-grid">'
        + lecons.map(l =>
            '<a class="lecon-carte" href="lecon.html?id=' + l.id + '">'
            + '<span class="lc-num">Leçon ' + (l.ordre || 1) + '</span>'
            + '<h3>' + esc(l.titre) + '</h3>'
            + (l.apercu ? '<p>' + esc(l.apercu) + '</p>' : '')
            + '<span class="lc-go">Lire la leçon →</span></a>'
          ).join("")
        + '</div>';
    }
    if (quiz && quiz.length) {
      html += '<div class="lecons-head" style="margin-top:32px"><h2>' + quiz.length + (quiz.length > 1 ? " quiz" : " quiz") + '</h2></div>'
        + '<div class="lecons-grid">'
        + quiz.map(q => {
            const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
            const estDimanche = q.type === "dimanche";
            return '<a class="lecon-carte quiz-carte' + (estDimanche ? ' dimanche' : '') + '" href="quiz.html?id=' + q.id + '">'
              + '<span class="lc-num">' + (estDimanche ? "Quiz du dimanche" : "Quiz") + '</span>'
              + '<h3>' + esc(q.titre) + '</h3>'
              + '<p>' + nbQ + ' questions · ' + Math.round(q.duree_sec/60) + ' min chronométrées</p>'
              + '<span class="lc-go">Relever le défi →</span></a>';
          }).join("")
        + '</div>';
    }
    zone.innerHTML = html;
  }

  majMatieres();
})();

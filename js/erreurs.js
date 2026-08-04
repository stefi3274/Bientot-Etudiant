/* ============================================================
   Mes erreurs — révise les questions ratées (par matière si un
   paramètre ?matiere= est fourni, sinon toutes). Une bonne réponse
   ici marque la question comme résolue (retirée de la liste).
   ============================================================ */
(function () {
  const zone = document.getElementById("quizZone");
  if (!zone) return;
  const params = new URLSearchParams(location.search);
  const matiereFiltre = params.get("matiere");
  const filiereFiltre = params.get("f");
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  let questions = [], erreursMap = {}, reponses = {}, eleveConnecte = null;

  (async function () {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p style='text-align:center'>Indisponible pour le moment.</p>"; return; }

    const el = await eleveActuel();
    if (!el || !el.nom) {
      zone.innerHTML = "<p style='text-align:center'>Connecte-toi pour voir tes erreurs à retravailler. <a href='connexion.html'>Se connecter</a></p>";
      return;
    }
    eleveConnecte = el;
    if (filiereFiltre) document.body.setAttribute("data-filiere", filiereFiltre);

    let q = DB.from("erreurs").select("question_id, matiere, questions(*)").eq("user_id", el.user_id).eq("resolu", false);
    if (matiereFiltre) q = q.eq("matiere", matiereFiltre);
    const { data, error } = await q;

    if (error || !data || !data.length) {
      zone.innerHTML =
        '<div class="quiz-intro"><h1>Rien à retravailler ' + (matiereFiltre ? "en " + esc(matiereFiltre) : "") + ' 🎉</h1>'
        + '<p class="qi-note">Toutes tes erreurs de cette matière ont été corrigées, ou tu n\'en as pas encore. Continue à réviser !</p>'
        + '<a href="espace.html" class="btn btn-dark">Retour à mon espace <span>→</span></a></div>';
      return;
    }

    questions = data.filter(d => d.questions).map(d => d.questions);
    ecranIntro();
  })();

  function ecranIntro() {
    zone.innerHTML =
      '<div class="quiz-intro">'
      + '<span class="qi-kicker">' + esc(matiereFiltre || "Toutes matières") + '</span>'
      + '<h1>Retravaille tes erreurs</h1>'
      + '<div class="qi-facts">'
      + '<div class="qi-fact"><b>' + questions.length + '</b><span>question' + (questions.length > 1 ? "s" : "") + '</span></div>'
      + '</div>'
      + '<p class="qi-note">Pas de chrono ici — prends le temps qu\'il te faut. Une bonne réponse retire la question de ta liste.</p>'
      + '<button class="btn btn-dark" id="startBtn">Commencer <span>→</span></button>'
      + '</div>';
    document.getElementById("startBtn").addEventListener("click", afficherQuestions);
  }

  function afficherQuestions() {
    const html = questions.map((q, i) =>
      '<div class="q-block" id="qb-' + i + '">'
      + '<span class="q-num">Question ' + (i+1) + ' / ' + questions.length + '</span>'
      + '<p class="q-enonce">' + esc(q.enonce) + '</p>'
      + ['a','b','c','d'].map(l =>
          '<label class="q-choix"><input type="radio" name="q-' + i + '" value="' + l + '">'
          + '<span class="q-lettre">' + l.toUpperCase() + '</span>'
          + '<span class="q-txt">' + esc(q["choix_" + l]) + '</span></label>'
        ).join("")
      + '</div>'
    ).join("");

    zone.innerHTML =
      '<div class="quiz-run">'
      + '<div class="quiz-bar"><span class="qb-titre">Mes erreurs</span></div>'
      + '<div class="q-list">' + html + '</div>'
      + '<button class="btn btn-dark" id="finishBtn" style="margin-top:20px">Corriger <span>→</span></button>'
      + '</div>';

    zone.querySelectorAll("input[type=radio]").forEach(r =>
      r.addEventListener("change", e => { reponses[e.target.name] = e.target.value; }));
    document.getElementById("finishBtn").addEventListener("click", terminer);
  }

  async function terminer() {
    let score = 0;
    const idsReussies = [], idsRatees = [];
    questions.forEach((q, i) => {
      const rep = reponses["q-" + i];
      if (rep === q.bonne) { score++; idsReussies.push(q.id); }
      else idsRatees.push(q.id);
    });

    if (eleveConnecte && DB) {
      if (idsReussies.length) await DB.from("erreurs").update({ resolu: true }).eq("user_id", eleveConnecte.user_id).in("question_id", idsReussies);
      if (idsRatees.length) await DB.from("erreurs").update({ updated_at: new Date().toISOString() }).eq("user_id", eleveConnecte.user_id).in("question_id", idsRatees);
      if (window.majStreak) await window.majStreak(eleveConnecte);
    }

    const pct = Math.round(100 * score / questions.length);
    const correctum = questions.map((q, i) => {
      const rep = reponses["q-" + i];
      const juste = rep === q.bonne;
      const choix = ['a','b','c','d'].map(l => {
        const estBon = (l === q.bonne);
        const estChoisi = (l === rep);
        let cls = "cx";
        if (estBon) cls += " cx-bon";
        else if (estChoisi) cls += " cx-mauvais";
        const marque = estBon ? "✓" : (estChoisi ? "✗" : "");
        return '<div class="' + cls + '"><span class="cx-l">' + l.toUpperCase() + '</span>'
          + '<span class="cx-t">' + esc(q["choix_" + l]) + '</span>'
          + (marque ? '<span class="cx-m">' + marque + '</span>' : '') + '</div>';
      }).join("");
      return '<div class="cr-q ' + (juste ? "cr-ok" : "cr-no") + '">'
        + '<div class="cr-head"><span class="cr-badge">' + (juste ? "Résolue" : "Encore ratée") + '</span>'
        + '<span class="cr-n">Question ' + (i+1) + '</span></div>'
        + '<p class="cr-enonce">' + esc(q.enonce) + '</p>'
        + '<div class="cr-choix">' + choix + '</div></div>';
    }).join("");

    zone.innerHTML =
      '<div class="quiz-result">'
      + '<div class="score-ring ' + (pct>=50?"ok":"low") + '"><b>' + score + '</b><span>/ ' + questions.length + '</span></div>'
      + '<h1>' + (idsReussies.length) + ' question' + (idsReussies.length > 1 ? "s" : "") + ' résolue' + (idsReussies.length > 1 ? "s" : "") + ' !</h1>'
      + '<p class="score-meta">' + (idsRatees.length ? idsRatees.length + " reste" + (idsRatees.length > 1 ? "nt" : "") + " à retravailler" : "Toutes tes erreurs de cette série sont corrigées 🎉") + '</p>'
      + '<div class="correctum"><h3>Correction</h3>'
      + '<p class="cr-legende"><span class="lg lg-bon">Vert = bonne réponse</span> · <span class="lg lg-mauvais">Rouge = ta réponse fausse</span></p>'
      + correctum + '</div>'
      + '<div class="quiz-result-actions">'
      + (idsRatees.length ? '<a class="btn btn-dark" href="erreurs.html' + (matiereFiltre ? "?matiere=" + encodeURIComponent(matiereFiltre) : "") + '">Refaire les erreurs restantes</a>' : '')
      + '<a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="espace.html">Retour à mon espace</a>'
      + '</div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
})();

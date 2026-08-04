/* ============================================================
   Super Quiz — quiz libre, questions aléatoires toutes matières
   confondues. Accès réservé aux postulants connectés. Enregistré
   dans un classement dédié (super_tentatives), fait progresser le
   streak, et alimente "Mes erreurs" pour les questions ratées.
   ============================================================ */
(function () {
  const zone = document.getElementById("quizZone");
  if (!zone) return;
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmtTemps = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");
  const NB_QUESTIONS = 15;
  const SEC_PAR_QUESTION = 40;

  let questions = [], reponses = {}, tempsRestant = 0, timer = null, tempsMis = 0, demarre = 0, dureeSec = 0, eleveConnecte = null;

  (async function () {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p style='text-align:center'>Indisponible pour le moment.</p>"; return; }

    const el = await eleveActuel();
    if (!el || !el.nom) { ecranGate(); return; }
    eleveConnecte = el;

    ecranIntro(el);
  })();

  // ---------- Écran de blocage (non connecté) ----------
  function ecranGate() {
    zone.innerHTML =
      '<div class="quiz-intro super-quiz-splash">'
      + '<span class="qi-kicker" style="color:#fff">🌈 Super Quiz</span>'
      + '<h1 style="color:#fff">Teste ton niveau, toutes matières confondues</h1>'
      + '<p style="color:rgba(255,255,255,.9);max-width:520px;margin:0 auto 22px">Le Super Quiz mélange des questions de toutes les matières pour un vrai défi. Réservé aux postulant.e.s inscrit.e.s.</p>'
      + '<a href="inscription.html" class="btn" style="background:#fff;color:#222">Créer un compte <span>→</span></a>'
      + ' <a href="connexion.html" class="btn btn-ghost" style="border-color:#fff;color:#fff">Se connecter</a>'
      + '</div>';
  }

  // ---------- Écran d'intro (connecté) ----------
  function ecranIntro(el) {
    zone.innerHTML =
      '<div class="quiz-intro super-quiz-splash">'
      + '<span class="qi-kicker" style="color:#fff">🌈 Super Quiz</span>'
      + '<h1 style="color:#fff">Prêt.e à tester ton niveau, ' + esc((el.nom||"").split(" ")[0]) + ' ?</h1>'
      + '<p style="color:rgba(255,255,255,.9);max-width:520px;margin:0 auto 10px">' + NB_QUESTIONS + ' questions piochées au hasard dans toutes les matières. Un vrai mélange, pour voir où tu en es vraiment.</p>'
      + '<div id="startZone"><p style="color:#fff">Préparation…</p></div>'
      + '</div>';
    chargerQuestions();
  }

  // ---------- Chargement du pool de questions (toutes matières, quiz publiés) ----------
  async function chargerQuestions() {
    const { data } = await DB.from("questions")
      .select("*, quiz!inner(publie, filiere, matiere)")
      .eq("quiz.publie", true);

    const startZone = document.getElementById("startZone");
    if (!data || data.length < 5) {
      if (startZone) startZone.innerHTML = '<p style="color:#fff">Pas encore assez de questions disponibles sur le site pour lancer un Super Quiz. Reviens bientôt !</p>';
      return;
    }

    // mélange (Fisher-Yates) puis on garde NB_QUESTIONS max
    const pool = data.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    questions = pool.slice(0, Math.min(NB_QUESTIONS, pool.length));
    dureeSec = questions.length * SEC_PAR_QUESTION;

    if (startZone) {
      startZone.innerHTML =
        '<div class="qi-facts" style="justify-content:center;margin-bottom:18px">'
        + '<div class="qi-fact" style="color:#fff"><b>' + questions.length + '</b><span>questions</span></div>'
        + '<div class="qi-fact" style="color:#fff"><b>' + Math.round(dureeSec/60) + ' min</b><span>chronométrées</span></div>'
        + '</div>'
        + '<button class="btn" id="startBtn" style="background:#fff;color:#222">Commencer le Super Quiz <span>→</span></button>';
      document.getElementById("startBtn").addEventListener("click", demarrer);
    }
  }

  // ---------- Déroulement (identique au quiz classique) ----------
  function demarrer() {
    tempsRestant = dureeSec;
    demarre = Date.now();
    afficherQuestions();
    timer = setInterval(() => {
      tempsRestant--;
      const t = document.getElementById("chrono");
      if (t) { t.textContent = fmtTemps(tempsRestant); if (tempsRestant <= 30) t.classList.add("urgent"); }
      if (tempsRestant <= 0) { clearInterval(timer); terminer(true); }
    }, 1000);
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
      + '<div class="quiz-bar"><span class="qb-titre">🌈 Super Quiz</span>'
      + '<span class="chrono" id="chrono">' + fmtTemps(tempsRestant) + '</span></div>'
      + '<div class="q-list">' + html + '</div>'
      + '<button class="btn btn-dark" id="finishBtn" style="margin-top:20px">Terminer et voir mon score <span>→</span></button>'
      + '</div>';

    zone.querySelectorAll("input[type=radio]").forEach(r =>
      r.addEventListener("change", e => { reponses[e.target.name] = e.target.value; }));
    document.getElementById("finishBtn").addEventListener("click", () => {
      const rep = Object.keys(reponses).length;
      if (rep < questions.length && !confirm("Il te reste " + (questions.length - rep) + " question(s) sans réponse. Terminer quand même ?")) return;
      clearInterval(timer); terminer(false);
    });
  }

  // ---------- Fin : score + correction + classement + streak + erreurs ----------
  async function terminer(tempsEcoule) {
    tempsMis = Math.min(dureeSec, Math.round((Date.now() - demarre) / 1000));
    let score = 0;
    questions.forEach((q, i) => { if (reponses["q-" + i] === q.bonne) score++; });
    const pct = Math.round(100 * score / questions.length);

    if (eleveConnecte && DB) {
      await DB.from("super_tentatives").insert({
        user_id: eleveConnecte.user_id, nom: eleveConnecte.nom,
        score, total: questions.length, temps_sec: tempsMis
      });

      const questionsRatees = questions
        .filter((q, i) => reponses["q-" + i] !== q.bonne)
        .map(q => ({ user_id: eleveConnecte.user_id, question_id: q.id, quiz_id: q.quiz_id || null,
          filiere: (q.quiz && q.quiz.filiere) || null, matiere: (q.quiz && q.quiz.matiere) || null,
          resolu: false, updated_at: new Date().toISOString() }));
      if (questionsRatees.length) await DB.from("erreurs").upsert(questionsRatees, { onConflict: "user_id,question_id" });
      const idsReussies = questions.filter((q, i) => reponses["q-" + i] === q.bonne).map(q => q.id);
      if (idsReussies.length) await DB.from("erreurs").update({ resolu: true }).eq("user_id", eleveConnecte.user_id).in("question_id", idsReussies);

      if (window.majStreak) await window.majStreak(eleveConnecte);
    }

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
        + '<div class="cr-head"><span class="cr-badge">' + (juste ? "Juste" : "Faux") + '</span>'
        + '<span class="cr-n">Question ' + (i+1) + '</span></div>'
        + '<p class="cr-enonce">' + esc(q.enonce) + '</p>'
        + '<div class="cr-choix">' + choix + '</div></div>';
    }).join("");

    const ratHtml = '<div class="correctum"><h3>Correction</h3>'
      + '<p class="cr-legende"><span class="lg lg-bon">Vert = bonne réponse</span> · <span class="lg lg-mauvais">Rouge = ta réponse fausse</span></p>'
      + correctum + '</div>';

    const titreFelic = pct >= 80 ? "Excellent" : pct >= 50 ? "Bien joué" : "Continue à réviser";

    zone.innerHTML =
      '<div class="quiz-result">'
      + (tempsEcoule ? '<p class="temps-ecoule">⏱ Temps écoulé !</p>' : '')
      + '<div class="score-ring ' + (pct>=50?"ok":"low") + '"><b>' + score + '</b><span>/ ' + questions.length + '</span></div>'
      + '<h1>' + titreFelic + ' !</h1>'
      + '<p class="score-meta">' + pct + '% de bonnes réponses · Temps : ' + fmtTemps(tempsMis) + '</p>'
      + ratHtml
      + '<div class="quiz-result-actions">'
      + '<a class="btn btn-primary" href="super-classement.html">Voir le classement <span>→</span></a>'
      + '<a class="btn btn-dark" href="super-quiz.html">Refaire un Super Quiz</a>'
      + '<a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="index.html">Retour à l\'accueil</a>'
      + '</div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
})();

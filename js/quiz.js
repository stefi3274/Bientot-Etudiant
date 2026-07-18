/* ============================================================
   Passer un quiz : chrono global, QCM, score, questions ratées
   ============================================================ */
(function () {
  const zone = document.getElementById("quizZone");
  if (!zone) return;
  const id = new URLSearchParams(location.search).get("id");
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmtTemps = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");

  let quiz = null, questions = [], reponses = {}, tempsRestant = 0, timer = null, tempsMis = 0, demarre = 0;

  if (!id) { zone.innerHTML = "<p style='text-align:center'>Quiz introuvable.</p>"; return; }

  (async function () {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = "<p style='text-align:center'>Quiz indisponible.</p>"; return; }
    const { data: qz } = await DB.from("quiz").select("*").eq("id", id).eq("publie", true).maybeSingle();
    if (!qz) { zone.innerHTML = "<p style='text-align:center'>Ce quiz n'existe pas.</p>"; return; }
    quiz = qz;
    const { data: qs } = await DB.from("questions").select("*").eq("quiz_id", id).order("ordre");
    if (!qs || !qs.length) { zone.innerHTML = "<p style='text-align:center'>Ce quiz n'a pas encore de questions.</p>"; return; }
    questions = qs;
    if (quiz.filiere) document.body.setAttribute("data-filiere", quiz.filiere);
    ecranIntro();
  })();

  // ---------- Écran d'intro ----------
  function ecranIntro() {
    zone.innerHTML =
      '<div class="quiz-intro">'
      + '<span class="qi-kicker">' + esc(quiz.matiere) + '</span>'
      + '<h1>' + esc(quiz.titre) + '</h1>'
      + '<div class="qi-facts">'
      + '<div class="qi-fact"><b>' + questions.length + '</b><span>questions</span></div>'
      + '<div class="qi-fact"><b>' + Math.round(quiz.duree_sec/60) + ' min</b><span>chronométrées</span></div>'
      + '<div class="qi-fact"><b>1</b><span>bonne réponse / question</span></div>'
      + '</div>'
      + '<p class="qi-note">Le chronomètre démarre dès que tu cliques. À la fin, tu verras ton score et les questions ratées.</p>'
      + '<div id="introMsg"></div>'
      + '<button class="btn btn-dark" id="startBtn">Commencer le quiz <span>→</span></button>'
      + ' <a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="classement.html?quiz=' + quiz.id + '">Voir le classement</a>'
      + '</div>';
    document.getElementById("startBtn").addEventListener("click", async () => {
      const el = await eleveActuel();
      if (!el || !el.nom) {
        document.getElementById("introMsg").innerHTML =
          '<div class="form-msg on err" style="margin-bottom:14px">Connecte-toi pour passer le quiz et apparaître au classement. <a href="connexion.html" style="font-weight:600">Se connecter</a></div>';
        return;
      }
      demarrer();
    });
  }

  // ---------- Déroulement ----------
  function demarrer() {
    tempsRestant = quiz.duree_sec;
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
      + '<div class="quiz-bar"><span class="qb-titre">' + esc(quiz.titre) + '</span>'
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

  // ---------- Fin : score + questions ratées ----------
  async function terminer(tempsEcoule) {
    tempsMis = Math.min(quiz.duree_sec, Math.round((Date.now() - demarre) / 1000));
    let score = 0;
    const ratees = [];
    questions.forEach((q, i) => {
      const rep = reponses["q-" + i];
      if (rep === q.bonne) score++;
      else ratees.push({ q, i, rep });
    });

    // enregistrer la tentative
    const el = await eleveActuel();
    if (el && el.nom && DB) {
      const ent = await entrepriseId();
      await DB.from("tentatives").insert({
        quiz_id: quiz.id, entreprise_id: ent, user_id: el.user_id, nom: el.nom,
        filiere: quiz.filiere, matiere: quiz.matiere,
        score: score, total: questions.length, temps_sec: tempsMis
      });
    }

    const pct = Math.round(100 * score / questions.length);

    // Correctum complet : toutes les questions, vert = bon, rouge = mauvais choix
    const correctum = questions.map((q, i) => {
      const rep = reponses["q-" + i];
      const juste = rep === q.bonne;
      const choix = ['a','b','c','d'].map(l => {
        const estBon = (l === q.bonne);
        const estChoisi = (l === rep);
        let cls = "cx";
        if (estBon) cls += " cx-bon";               // la bonne réponse toujours en vert
        else if (estChoisi) cls += " cx-mauvais";   // le mauvais choix du postulant en rouge
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

    const prenom = (el && el.nom) ? el.nom.split(" ")[0] : "";
    const titreFelic = pct >= 80 ? "Bravo" : pct >= 50 ? "Bien joué" : "Courage";
    const felic = prenom ? (titreFelic + ", " + esc(prenom) + " !") : (titreFelic + " !");

    // Message de partage (texte + lien)
    const lien = "https://bientot-etudiant.vercel.app/quiz.html?id=" + quiz.id;
    const txtPartage = "J'ai obtenu " + score + "/" + questions.length + " au quiz « " + quiz.titre + " » sur Bientôt Étudiant ! Prépare-toi au concours avec moi : ";
    const encTxt = encodeURIComponent(txtPartage);
    const encLien = encodeURIComponent(lien);
    const partage =
      '<div class="partage"><span class="pt-label">Partager mon score</span>'
      + '<div class="pt-btns">'
      + '<a class="pt-btn wa" href="https://wa.me/?text=' + encTxt + encLien + '" target="_blank" rel="noopener">WhatsApp</a>'
      + '<a class="pt-btn fb" href="https://www.facebook.com/sharer/sharer.php?u=' + encLien + '" target="_blank" rel="noopener">Facebook</a>'
      + '<button class="pt-btn cp" id="copyBtn" data-txt="' + esc(txtPartage + lien) + '">Copier</button>'
      + '</div></div>';

    zone.innerHTML =
      '<div class="quiz-result">'
      + (tempsEcoule ? '<p class="temps-ecoule">⏱ Temps écoulé !</p>' : '')
      + '<div class="score-ring ' + (pct>=50?"ok":"low") + '"><b>' + score + '</b><span>/ ' + questions.length + '</span></div>'
      + '<h1>' + felic + '</h1>'
      + '<p class="score-meta">' + pct + '% de bonnes réponses · Temps : ' + fmtTemps(tempsMis) + '</p>'
      + partage
      + ratHtml
      + '<div class="quiz-result-actions">'
      + '<a class="btn btn-primary" href="classement.html?quiz=' + quiz.id + '">Voir le classement <span>→</span></a>'
      + '<a class="btn btn-dark" href="quiz.html?id=' + quiz.id + '">Recommencer</a>'
      + '<a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="matiere.html?f=' + quiz.filiere + '&m=' + encodeURIComponent(quiz.matiere) + '">Retour à la matière</a>'
      + '</div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Bouton copier
    const cp = document.getElementById("copyBtn");
    if (cp) cp.addEventListener("click", () => {
      navigator.clipboard.writeText(cp.getAttribute("data-txt")).then(() => {
        cp.textContent = "Copié ✓";
        setTimeout(() => cp.textContent = "Copier", 2000);
      });
    });

    // Confettis si score correct
    if (pct >= 50) lancerConfettis();
  }

  // ---------- Confettis (canvas, sans librairie) ----------
  function lancerConfettis() {
    const cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    let W = cv.width = innerWidth, H = cv.height = innerHeight;
    const couleurs = ["#e8b84b","#2a9d6f","#2c6e8f","#9c3f56","#c25b4e","#f7f4ec"];
    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.4,
        r: 5 + Math.random() * 7, c: couleurs[Math.floor(Math.random() * couleurs.length)],
        vy: 2 + Math.random() * 3.5, vx: -1.5 + Math.random() * 3,
        rot: Math.random() * 6.28, vr: -0.15 + Math.random() * 0.3
      });
    }
    let t0 = Date.now();
    (function anim() {
      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r * 0.5);
        ctx.restore();
      });
      if (Date.now() - t0 < 3200) requestAnimationFrame(anim);
      else cv.remove();
    })();
  }
})();

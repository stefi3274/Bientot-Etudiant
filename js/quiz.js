/* ============================================================
   Passer un quiz : chrono global, QCM, score, questions ratées
   ============================================================ */
(function () {
  const zone = document.getElementById("quizZone");
  if (!zone) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const defiNom = params.get("defiNom");
  const defiScore = params.get("defiScore") ? parseInt(params.get("defiScore"), 10) : null;
  const defiTotal = params.get("defiTotal") ? parseInt(params.get("defiTotal"), 10) : null;
  const gogo = params.get("gogo") === "1";
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmtTemps = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");

  // ---------- Suivi local (invités + mode Gogo) : fenêtre glissante de 24h ----------
  function lireTableau(cle) {
    try { return JSON.parse(localStorage.getItem(cle) || "[]"); } catch (e) { return []; }
  }
  function ecrireTableau(cle, arr) {
    try { localStorage.setItem(cle, JSON.stringify(arr)); } catch (e) {}
  }
  function pruner24h(arr) {
    const limite = Date.now() - 24 * 60 * 60 * 1000;
    return arr.filter(r => r.ts > limite);
  }
  function compterMatiereLocal(matiere) {
    return pruner24h(lireTableau("bq_hist_matiere")).filter(r => r.matiere === matiere).length;
  }
  function enregistrerMatiereLocal(matiere) {
    const arr = pruner24h(lireTableau("bq_hist_matiere"));
    arr.push({ matiere, ts: Date.now() });
    ecrireTableau("bq_hist_matiere", arr);
  }
  async function compterMatiereDB(matiere, userId) {
    const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await DB.from("tentatives").select("id").eq("user_id", userId).eq("matiere", matiere).gte("created_at", depuis);
    return (data || []).length;
  }
  function compterGogoLocal() {
    return pruner24h(lireTableau("bq_hist_gogo")).length;
  }
  function enregistrerGogoLocal() {
    const arr = pruner24h(lireTableau("bq_hist_gogo"));
    arr.push({ ts: Date.now() });
    ecrireTableau("bq_hist_gogo", arr);
  }

  // ---------- Carte de résultat partageable (Canvas) ----------
  const CARTE = { taille: 1080, ardoise: "#14342b", craie: "#f7f4ec", craie2: "#ede8da" };
  const ACCENTS = { f1: "#2a9d6f", f2: "#4a90c4", f3: "#c96b83" };
  const FILIERES_LABEL = { f1: "Médecine, Agronomie & Vétérinaire", f2: "Sciences administratives, Économie & Génie", f3: "Sciences humaines et sociales" };
  let logoImg = null;
  function chargerLogo() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { logoImg = img; resolve(); };
      img.onerror = () => resolve();
      img.src = "img/logo.png";
    });
  }
  function hexToRgba(hex, a) {
    const n = parseInt(hex.replace("#", ""), 16);
    return "rgba(" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",") + "," + a + ")";
  }
  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }
  function decouperTexte(ctx, texte, maxWidth) {
    const mots = (texte || "").split(/\s+/);
    const lignes = []; let ligne = "";
    mots.forEach(mot => {
      const essai = ligne ? ligne + " " + mot : mot;
      if (ctx.measureText(essai).width > maxWidth && ligne) { lignes.push(ligne); ligne = mot; }
      else ligne = essai;
    });
    if (ligne) lignes.push(ligne);
    return lignes;
  }

  async function genererCarteResultat(quiz, score, total, pct, prenom, infosDefi) {
    if (!logoImg) await chargerLogo();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const T = CARTE.taille;
    const accent = ACCENTS[quiz.filiere] || CARTE.craie2;
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");

    ctx.fillStyle = CARTE.ardoise; ctx.fillRect(0, 0, T, T);
    const glow = ctx.createRadialGradient(T*0.85, T*0.1, 0, T*0.85, T*0.1, T*0.75);
    glow.addColorStop(0, hexToRgba(accent, 0.28)); glow.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, T, T);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, T, 8);

    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.fillText("CONCOURS D'ENTRÉE À L'UNIVERSITÉ", 80, 120);

    ctx.fillStyle = CARTE.craie;
    ctx.font = "600 46px Fraunces, Georgia, serif";
    const nomLigne = prenom ? prenom + " a obtenu" : "J'ai obtenu";
    ctx.fillText(nomLigne, 80, 200);

    // Gros score au centre
    ctx.textAlign = "center";
    ctx.font = "700 220px Fraunces, Georgia, serif";
    ctx.fillStyle = accent;
    ctx.fillText(String(score), T/2 - 70, 470);
    ctx.font = "600 70px Fraunces, Georgia, serif";
    ctx.fillStyle = "rgba(247,244,236,.55)";
    ctx.fillText("/ " + total, T/2 + 130, 470);
    ctx.textAlign = "left";

    ctx.textAlign = "center";
    ctx.fillStyle = CARTE.craie;
    ctx.font = "700 34px Inter, system-ui, sans-serif";
    ctx.fillText(pct + "% de bonnes réponses", T/2, 550);
    ctx.textAlign = "left";

    // Ligne défi fair-play (si cette partie répondait à un défi)
    let yTitre = 660;
    if (infosDefi) {
      ctx.textAlign = "center";
      ctx.font = "700 28px Inter, system-ui, sans-serif";
      ctx.fillStyle = accent;
      ctx.fillText(infosDefi, T/2, 600);
      ctx.textAlign = "left";
      yTitre = 680;
    }

    // Pastille titre du quiz
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    const lignesTitre = decouperTexte(ctx, quiz.titre, T - 160);
    let y = yTitre;
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(247,244,236,.85)";
    lignesTitre.slice(0, 2).forEach(l => { ctx.fillText(l, T/2, y); y += 38; });
    ctx.font = "500 26px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.6)";
    ctx.fillText(FILIERES_LABEL[quiz.filiere] || quiz.matiere, T/2, y + 10);
    ctx.textAlign = "left";

    // Pied de page
    const py = T - 58;
    ctx.strokeStyle = "rgba(247,244,236,.15)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, py - 30); ctx.lineTo(T - 60, py - 30); ctx.stroke();
    if (logoImg) ctx.drawImage(logoImg, 60, py - 12, 34, 41);
    ctx.fillStyle = CARTE.craie;
    ctx.font = "600 26px Fraunces, Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Bientôt Étudiant", logoImg ? 104 : 60, py + 8);
    ctx.font = "500 19px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.textAlign = "right";
    ctx.fillText("bientot-etudiant.vercel.app", T - 60, py + 8);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    return cv;
  }

  let quiz = null, questions = [], reponses = {}, tempsRestant = 0, timer = null, tempsMis = 0, demarre = 0, eleveConnecte = null;

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
    const el = await eleveActuel();
    eleveConnecte = (el && el.nom) ? el : null;

    // Restriction "même matière" — invité : 1/24h, connecté : 2/24h. Le mode Gogo l'ignore.
    if (!gogo) {
      const limite = eleveConnecte ? 2 : 1;
      const compte = eleveConnecte ? await compterMatiereDB(quiz.matiere, eleveConnecte.user_id) : compterMatiereLocal(quiz.matiere);
      if (compte >= limite) { ecranBloqueMatiere(quiz.matiere); return; }
    }

    // Quiz lié à une leçon (pas un quiz libre "dimanche") -> proposer de lire la leçon d'abord
    const clefVue = "lecon_demandee_" + quiz.id;
    if (quiz.type !== "dimanche" && quiz.lecon_id && !sessionStorage.getItem(clefVue)) {
      ecranChoixLecon();
    } else {
      ecranIntro();
    }
  })();

  // ---------- Écran de blocage : limite de matière atteinte ----------
  function ecranBloqueMatiere(matiere) {
    if (!eleveConnecte) {
      zone.innerHTML =
        '<div class="quiz-intro restriction-bloc">'
        + '<span class="qi-kicker">' + esc(matiere) + '</span>'
        + '<h1>Tu as déjà fait un quiz de ' + esc(matiere) + ' aujourd\'hui</h1>'
        + '<p class="qi-note">Sans compte, tu peux faire 1 quiz par matière toutes les 24h. Crée un compte gratuit pour t\'entraîner sans cette limite.</p>'
        + '<a href="inscription.html" class="btn btn-dark">Créer un compte <span>→</span></a>'
        + ' <a href="index.html#explorerSection" class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)">Essayer une autre matière</a>'
        + '</div>';
    } else {
      zone.innerHTML =
        '<div class="quiz-intro restriction-bloc">'
        + '<span class="qi-kicker">' + esc(matiere) + '</span>'
        + '<h1>Tu as fait le plein de ' + esc(matiere) + ' pour aujourd\'hui !</h1>'
        + '<p class="qi-note">2 quiz de la même matière par 24h, c\'est le maximum, pour garder un bon rythme de révision. Reviens demain, ou entraîne-toi sur une autre matière en attendant.</p>'
        + '<a href="index.html#explorerSection" class="btn btn-dark">Essayer une autre matière <span>→</span></a>'
        + ' <a href="espace.html" class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)">Mon espace</a>'
        + '</div>';
    }
  }

  // ---------- Proposer de lire la leçon avant le quiz ----------
  function ecranChoixLecon() {
    zone.innerHTML =
      '<div class="quiz-intro">'
      + '<span class="qi-kicker">' + esc(quiz.matiere) + '</span>'
      + '<h1>Veux-tu lire la leçon d\'abord ?</h1>'
      + '<p class="qi-note">« ' + esc(quiz.titre) + ' » est lié à une leçon. La lire avant t\'aidera à mieux répondre.</p>'
      + '<button class="btn btn-dark" id="lireLeconBtn">Lire la leçon d\'abord <span>→</span></button>'
      + ' <button class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" id="direQuizBtn">Non, je fais le quiz directement</button>'
      + '</div>';
    document.getElementById("lireLeconBtn").addEventListener("click", () => {
      sessionStorage.setItem("lecon_demandee_" + quiz.id, "1");
      location.href = "lecon.html?id=" + quiz.lecon_id;
    });
    document.getElementById("direQuizBtn").addEventListener("click", () => {
      sessionStorage.setItem("lecon_demandee_" + quiz.id, "1");
      ecranIntro();
    });
  }

  // ---------- Écran d'intro ----------
  function ecranIntro() {
    const blocClassementOuCompte = eleveConnecte
      ? '<a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="classement.html?quiz=' + quiz.id + '">Voir le classement</a>'
      : '<p class="qi-note" style="margin-top:14px">Tu peux faire ce quiz sans compte. <a href="inscription.html" style="font-weight:600">Crée un compte</a> pour enregistrer ta progression et apparaître au classement.</p>';
    const banniereDefi = (defiNom && defiScore !== null && defiTotal)
      ? '<div class="defi-banniere">🎯 <b>' + esc(defiNom) + '</b> te lance un défi amical : <b>' + defiScore + '/' + defiTotal + '</b> à égaler ou dépasser. Bonne chance !</div>'
      : '';
    zone.innerHTML =
      '<div class="quiz-intro">'
      + (gogo ? '<span class="badge-gogo">🔥 Mode Gogo</span>' : '')
      + banniereDefi
      + '<span class="qi-kicker">' + esc(quiz.matiere) + '</span>'
      + '<h1>' + esc(quiz.titre) + '</h1>'
      + '<div class="qi-facts">'
      + '<div class="qi-fact"><b>' + questions.length + '</b><span>questions</span></div>'
      + '<div class="qi-fact"><b>' + Math.round(quiz.duree_sec/60) + ' min</b><span>chronométrées</span></div>'
      + '<div class="qi-fact"><b>1</b><span>bonne réponse / question</span></div>'
      + '</div>'
      + '<p class="qi-note">Le chronomètre démarre dès que tu cliques. À la fin, tu verras ton score et les questions ratées.</p>'
      + '<button class="btn btn-dark" id="startBtn">Commencer le quiz <span>→</span></button>'
      + (eleveConnecte ? ' ' + blocClassementOuCompte : blocClassementOuCompte)
      + '</div>';
    document.getElementById("startBtn").addEventListener("click", demarrer);
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

    // enregistrer la tentative (uniquement si connecté)
    if (eleveConnecte && DB) {
      const ent = await entrepriseId();
      await DB.from("tentatives").insert({
        quiz_id: quiz.id, entreprise_id: ent, user_id: eleveConnecte.user_id, nom: eleveConnecte.nom,
        filiere: quiz.filiere, matiere: quiz.matiere,
        score: score, total: questions.length, temps_sec: tempsMis
      });

      // Mémoriser les questions ratées (pour "Mes erreurs") et marquer les résolues
      const questionsRatees = ratees.map(r => ({
        user_id: eleveConnecte.user_id, question_id: r.q.id, quiz_id: quiz.id,
        filiere: quiz.filiere, matiere: quiz.matiere, resolu: false, updated_at: new Date().toISOString()
      }));
      if (questionsRatees.length) await DB.from("erreurs").upsert(questionsRatees, { onConflict: "user_id,question_id" });
      const idsReussies = questions.filter((q, i) => reponses["q-" + i] === q.bonne).map(q => q.id);
      if (idsReussies.length) await DB.from("erreurs").update({ resolu: true }).eq("user_id", eleveConnecte.user_id).in("question_id", idsReussies);

      if (window.majStreak) await window.majStreak(eleveConnecte);
    }

    // Invité, hors mode Gogo : mémoriser localement pour la restriction par matière
    if (!eleveConnecte && !gogo) enregistrerMatiereLocal(quiz.matiere);

    // Mode Gogo : comptabiliser cette tentative dans la limite du jour
    let gogoAuMax = false;
    if (gogo) {
      enregistrerGogoLocal();
      const limiteGogo = eleveConnecte ? 5 : 2;
      gogoAuMax = compterGogoLocal() >= limiteGogo;
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

    const prenom = (eleveConnecte && eleveConnecte.nom) ? eleveConnecte.nom.split(" ")[0] : "";
    const titreFelic = pct >= 80 ? "Bravo" : pct >= 50 ? "Bien joué" : "Courage";
    const felic = prenom ? (titreFelic + ", " + esc(prenom) + " !") : (titreFelic + " !");

    // Message de partage / défi (texte + lien)
    const lien = "https://bientot-etudiant.vercel.app/quiz.html?id=" + quiz.id
      + "&defiNom=" + encodeURIComponent(prenom || (eleveConnecte && eleveConnecte.nom) || "Un.e ami.e")
      + "&defiScore=" + score + "&defiTotal=" + questions.length;
    const txtPartage = "Je te lance un défi amical sur Bientôt Étudiant ! Quiz « " + quiz.titre + " », j'ai fait " + score + "/" + questions.length + ". Prêt.e à essayer ? 💪 ";
    const encTxt = encodeURIComponent(txtPartage);
    const encLien = encodeURIComponent(lien);
    const partage =
      '<div class="partage"><span class="pt-label">Ou envoyer le lien du défi directement</span>'
      + '<div class="pt-btns">'
      + '<a class="pt-btn wa btn-pulse" href="https://wa.me/?text=' + encTxt + encLien + '" target="_blank" rel="noopener">WhatsApp</a>'
      + '<a class="pt-btn fb" href="https://www.facebook.com/sharer/sharer.php?u=' + encLien + '" target="_blank" rel="noopener">Facebook</a>'
      + '<button class="pt-btn cp" id="copyBtn" data-txt="' + esc(txtPartage + lien) + '">Copier</button>'
      + '</div><p class="qi-note" style="margin-top:8px">Pas besoin de compte pour relever le défi.</p></div>';

    // Comparaison si ce quiz a été ouvert via un lien de défi
    let compareDefi = "";
    let infosDefiCarte = null;
    if (defiNom && defiScore !== null && defiTotal) {
      const pctDefi = Math.round(100 * defiScore / defiTotal);
      let resultat = "egalite";
      if (pct > pctDefi) { compareDefi = '<p class="defi-resultat defi-gagne">🏆 Belle performance, tu devances ' + esc(defiNom) + ' (' + defiScore + '/' + defiTotal + ') !</p>'; infosDefiCarte = "🏆 Devant " + defiNom + " dans un défi amical"; resultat = "gagne"; }
      else if (pct === pctDefi) { compareDefi = '<p class="defi-resultat">🤝 Égalité parfaite avec ' + esc(defiNom) + ' — bien joué à vous deux !</p>'; infosDefiCarte = "🤝 Égalité avec " + defiNom; resultat = "egalite"; }
      else { compareDefi = '<p class="defi-resultat defi-perdu">👏 ' + esc(defiNom) + ' l\'emporte cette fois (' + defiScore + '/' + defiTotal + ') — belle occasion de retenter ta chance !</p>'; infosDefiCarte = "👏 Défi amical face à " + defiNom; resultat = "perdu"; }

      // Garder une trace du duel pour "Mes duels" dans l'espace personnel (connecté uniquement)
      if (eleveConnecte && DB) {
        DB.from("duels").insert({
          user_id: eleveConnecte.user_id, quiz_id: quiz.id, quiz_titre: quiz.titre,
          adversaire_nom: defiNom, mon_score: score, mon_total: questions.length,
          score_adversaire: defiScore, total_adversaire: defiTotal, resultat
        }).then(() => {});
      }
    }

    const actionClassementOuCompte = eleveConnecte
      ? '<a class="btn btn-primary" href="classement.html?quiz=' + quiz.id + '">Voir le classement <span>→</span></a>'
      : '<a class="btn btn-primary btn-pulse" href="inscription.html">Créer un compte pour suivre ma progression <span>→</span></a>';

    let gogoBloc = "";
    if (gogo) {
      if (gogoAuMax) {
        gogoBloc = '<p class="qi-note restriction-note">' + (eleveConnecte
          ? 'Tu as fait le plein de Quiz à Gogo pour aujourd\'hui (5/5). Reviens demain pour enchaîner à nouveau !'
          : 'Tu as fait 2 Quiz à Gogo sans compte, le maximum du jour. <a href="inscription.html" style="font-weight:600">Crée un compte</a> pour enchaîner jusqu\'à 5 par jour !') + '</p>';
      } else {
        gogoBloc = '<button class="btn btn-dark" id="gogoSuivantBtn" style="margin:18px 0">Quiz suivant (Gogo) <span>→</span></button>';
      }
    }

    zone.innerHTML =
      '<div class="quiz-result">'
      + (tempsEcoule ? '<p class="temps-ecoule">⏱ Temps écoulé !</p>' : '')
      + '<div class="score-ring ' + (pct>=50?"ok":"low") + '"><b>' + score + '</b><span>/ ' + questions.length + '</span></div>'
      + '<h1>' + felic + '</h1>'
      + '<p class="score-meta">' + pct + '% de bonnes réponses · Temps : ' + fmtTemps(tempsMis) + '</p>'
      + compareDefi
      + gogoBloc
      + '<div class="carte-resultat" id="carteResultatZone">'
      + '<img id="carteResultatImg" style="width:100%;max-width:320px;border-radius:16px;display:block;margin:0 auto 14px;box-shadow:0 8px 24px rgba(0,0,0,.15)" alt="Ma carte de résultat">'
      + '<div class="carte-resultat-actions">'
      + '<button class="btn btn-dark" id="telechargerCarteBtn">Télécharger ma carte <span>→</span></button>'
      + '<button class="btn btn-ghost" id="partagerCarteBtn" style="display:none;color:var(--encre);border-color:var(--craie-2)">Partager <span>→</span></button>'
      + '</div></div>'
      + partage
      + ratHtml
      + '<div class="quiz-result-actions">'
      + actionClassementOuCompte
      + '<a class="btn btn-dark" href="quiz.html?id=' + quiz.id + '">Recommencer</a>'
      + '<a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="matiere.html?f=' + quiz.filiere + '&m=' + encodeURIComponent(quiz.matiere) + '">Retour à la matière</a>'
      + '</div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Génération asynchrone de la carte partageable
    let carteCanvas = null;
    genererCarteResultat(quiz, score, questions.length, pct, prenom, infosDefiCarte).then(cv => {
      carteCanvas = cv;
      const img = document.getElementById("carteResultatImg");
      if (img) img.src = cv.toDataURL("image/png");

      const btnPartager = document.getElementById("partagerCarteBtn");
      if (btnPartager && navigator.share) {
        cv.toBlob(blob => {
          const fichier = new File([blob], "mon-resultat.png", { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
            btnPartager.style.display = "inline-flex";
            btnPartager.addEventListener("click", () => {
              navigator.share({
                files: [fichier],
                title: "Bientôt Étudiant",
                text: "J'ai fait " + score + "/" + questions.length + " au quiz « " + quiz.titre + " » ! À toi de jouer 👉 bientot-etudiant.vercel.app"
              }).catch(() => {});
            });
          }
        }, "image/png");
      }
    });

    const telechargerBtn = document.getElementById("telechargerCarteBtn");
    if (telechargerBtn) telechargerBtn.addEventListener("click", async () => {
      if (!carteCanvas) return;
      const blob = await new Promise(res => carteCanvas.toBlob(res, "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mon-resultat-bientot-etudiant.png";
      a.click();
      URL.revokeObjectURL(url);
    });

    // Bouton copier
    const cp = document.getElementById("copyBtn");
    if (cp) cp.addEventListener("click", () => {
      navigator.clipboard.writeText(cp.getAttribute("data-txt")).then(() => {
        cp.textContent = "Copié ✓";
        setTimeout(() => cp.textContent = "Copier", 2000);
      });
    });

    // Bouton "Quiz suivant" (mode Gogo) — reste dans le type "gogo" et la même matière
    const gogoBtn = document.getElementById("gogoSuivantBtn");
    if (gogoBtn) gogoBtn.addEventListener("click", async () => {
      gogoBtn.disabled = true; gogoBtn.textContent = "Recherche du quiz suivant…";
      const { data } = await DB.from("quiz").select("id").eq("publie", true).eq("type", "gogo")
        .eq("matiere", quiz.matiere).neq("id", quiz.id);
      if (!data || !data.length) { alert("Plus de Quiz à Gogo pour " + quiz.matiere + " pour l'instant. Reviens bientôt !"); location.href = "quiz-a-gogo.html"; return; }
      const pick = data[Math.floor(Math.random() * data.length)];
      location.href = "quiz.html?id=" + pick.id + "&gogo=1";
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

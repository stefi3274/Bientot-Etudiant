/* ============================================================
   Admin — génération de carousels (TikTok/Instagram) depuis un quiz
   Rendu en Canvas côté client (aucun coût API), export PNG zippés.
   Design repris du site : fond ardoise, texte craie, accents ocre.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const statusC = (m, t) => { const el = $("caMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  const TAILLE = 1080;
  const COULEURS = {
    ardoise: "#14342b",
    craie: "#f7f4ec",
    craie2: "#ede8da",
    ocre: "#e8b84b",
    ocreD: "#d4a336",
    f1: "#2a9d6f"
  };
  const FILIERES = { f1: "Médecine, Agronomie & Vétérinaire", f2: "Sciences administratives, Économie & Génie", f3: "Sciences humaines et sociales" };

  let logoImg = null;
  function chargerLogo() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { logoImg = img; resolve(); };
      img.onerror = () => resolve(); // pas bloquant si le logo est absent
      img.src = "img/logo.png";
    });
  }

  // Découpe un texte en lignes selon une largeur max, retourne le tableau de lignes
  function decouperTexte(ctx, texte, maxWidth) {
    const mots = (texte || "").split(/\s+/);
    const lignes = [];
    let ligne = "";
    mots.forEach(mot => {
      const essai = ligne ? ligne + " " + mot : mot;
      if (ctx.measureText(essai).width > maxWidth && ligne) {
        lignes.push(ligne);
        ligne = mot;
      } else {
        ligne = essai;
      }
    });
    if (ligne) lignes.push(ligne);
    return lignes;
  }

  function fondCommun(ctx) {
    ctx.fillStyle = COULEURS.ardoise;
    ctx.fillRect(0, 0, TAILLE, TAILLE);
    // liseré ocre en haut
    ctx.fillStyle = COULEURS.ocre;
    ctx.fillRect(0, 0, TAILLE, 10);
  }

  function piedDePage(ctx) {
    const y = TAILLE - 64;
    if (logoImg) ctx.drawImage(logoImg, 60, y - 28, 40, 49);
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 30px Fraunces, Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Bientôt " + "Étudiant", logoImg ? 112 : 60, y - 3);
    ctx.font = "500 22px Inter, system-ui, sans-serif";
    ctx.fillStyle = COULEURS.ocre;
    ctx.textAlign = "right";
    ctx.fillText("bientot-etudiant.vercel.app", TAILLE - 60, y - 3);
    ctx.textAlign = "left";
  }

  function slideIntro(quiz, nbQ) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    fondCommun(ctx);

    ctx.fillStyle = COULEURS.ocre;
    ctx.font = "700 26px Inter, system-ui, sans-serif";
    ctx.fillText("CONCOURS D'ENTRÉE À L'UNIVERSITÉ", 80, 220);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 76px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, quiz.titre, TAILLE - 160);
    let y = 320;
    lignesTitre.slice(0, 4).forEach(l => { ctx.fillText(l, 80, y); y += 86; });

    ctx.fillStyle = "rgba(247,244,236,.75)";
    ctx.font = "500 32px Inter, system-ui, sans-serif";
    ctx.fillText((FILIERES[quiz.filiere] || quiz.filiere || "") + " · " + (quiz.matiere || ""), 80, y + 30);

    // pastille nb questions
    const py = y + 90;
    ctx.fillStyle = COULEURS.f1;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(80, py, 320, 74, 37) : ctx.rect(80, py, 320, 74);
    ctx.fill();
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "700 30px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(nbQ + " questions", 110, py + 39);
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(247,244,236,.6)";
    ctx.font = "500 28px Inter, system-ui, sans-serif";
    ctx.fillText("Glisse pour tester tes connaissances →", 80, TAILLE - 140);

    piedDePage(ctx);
    return cv;
  }

  function slideQuestion(q, index, total) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    fondCommun(ctx);

    ctx.fillStyle = COULEURS.ocre;
    ctx.font = "700 26px Inter, system-ui, sans-serif";
    ctx.fillText("QUESTION " + index + " / " + total, 80, 130);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 52px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, q.enonce, TAILLE - 160);
    let y = 210;
    lignes.slice(0, 5).forEach(l => { ctx.fillText(l, 80, y); y += 60; });

    // Choix A-D
    const choix = [["A", q.choix_a], ["B", q.choix_b], ["C", q.choix_c], ["D", q.choix_d]];
    let cy = Math.max(y + 50, 520);
    const boxH = 96, gap = 20;
    choix.forEach(([lettre, texte]) => {
      ctx.fillStyle = COULEURS.craie2;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(80, cy, TAILLE - 160, boxH, 16); ctx.fill(); }
      else ctx.fillRect(80, cy, TAILLE - 160, boxH);

      ctx.fillStyle = COULEURS.ardoise;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(100, cy + 18, 60, 60, 12); ctx.fill(); }
      ctx.fillStyle = COULEURS.craie;
      ctx.font = "700 30px Inter, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(lettre, 130, cy + 48);
      ctx.textAlign = "left";

      ctx.fillStyle = "#1b3a5b";
      ctx.font = "500 30px Inter, system-ui, sans-serif";
      const ligneTxt = decouperTexte(ctx, texte || "", TAILLE - 160 - 200);
      ctx.fillText(ligneTxt[0] || "", 185, cy + 48);
      ctx.textBaseline = "alphabetic";

      cy += boxH + gap;
    });

    piedDePage(ctx);
    return cv;
  }

  function slideReponses(questions) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    fondCommun(ctx);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 64px Fraunces, Georgia, serif";
    ctx.fillText("Réponses", 80, 160);

    ctx.font = "600 40px Inter, system-ui, sans-serif";
    let y = 260;
    const parCol = Math.ceil(questions.length / 2);
    questions.forEach((q, i) => {
      const col = i < parCol ? 0 : 1;
      const ligne = i < parCol ? i : i - parCol;
      const x = 80 + col * 480;
      const yy = y + ligne * 70;
      ctx.fillStyle = COULEURS.ocre;
      ctx.fillText((i + 1) + ".", x, yy);
      ctx.fillStyle = COULEURS.craie;
      ctx.fillText((q.bonne || "").toUpperCase(), x + 60, yy);
    });

    ctx.fillStyle = COULEURS.f1;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(80, TAILLE - 260, TAILLE - 160, 100, 20); ctx.fill(); }
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "700 34px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Prépare ton concours sur Bientôt Étudiant", TAILLE / 2, TAILLE - 210);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    piedDePage(ctx);
    return cv;
  }

  function slidePromo(quiz) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    fondCommun(ctx);

    ctx.fillStyle = COULEURS.f1;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(80, 130, 380, 60, 30); ctx.fill(); }
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("NOUVEAU QUIZ", 108, 160);
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 70px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, quiz.titre, TAILLE - 160);
    let y = 300;
    lignes.slice(0, 4).forEach(l => { ctx.fillText(l, 80, y); y += 80; });

    ctx.fillStyle = "rgba(247,244,236,.75)";
    ctx.font = "500 32px Inter, system-ui, sans-serif";
    ctx.fillText((FILIERES[quiz.filiere] || quiz.filiere || "") + " · " + (quiz.matiere || ""), 80, y + 30);

    ctx.fillStyle = COULEURS.ocre;
    ctx.font = "600 34px Inter, system-ui, sans-serif";
    ctx.fillText("Teste tes connaissances →", 80, TAILLE - 150);

    piedDePage(ctx);
    return cv;
  }

  function texteSuggere(quiz) {
    return "📚 Nouveau quiz disponible sur Bientôt Étudiant !\n\n"
      + "🎯 " + quiz.titre + "\n"
      + "📖 " + (FILIERES[quiz.filiere] || quiz.filiere || "") + " · " + (quiz.matiere || "") + "\n\n"
      + "Teste tes connaissances et prépare-toi pour le concours d'entrée à l'université.\n\n"
      + "👉 bientot-etudiant.vercel.app\n\n"
      + "#ConcoursHaiti #BientôtÉtudiant #Éducation";
  }

  let postCanvas = null;

  if ($("caPostGenerer")) $("caPostGenerer").addEventListener("click", async () => {
    const quizId = $("caQuiz").value;
    if (!quizId) { statusC("Choisis un quiz.", "err"); return; }
    if (typeof DB === "undefined" || !DB) { statusC("Connexion Supabase indisponible.", "err"); return; }

    statusC("Génération du post…", "");
    try {
      const { data: quiz, error } = await DB.from("quiz").select("*").eq("id", quizId).single();
      if (error || !quiz) { statusC("Quiz introuvable.", "err"); return; }

      if (!logoImg) await chargerLogo();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      postCanvas = slidePromo(quiz);
      $("caPostImg").src = postCanvas.toDataURL("image/png");
      $("caPostTexte").value = texteSuggere(quiz);
      $("caPostZone").style.display = "block";
      statusC("Post promo prêt.", "ok");
    } catch (e) {
      statusC("Erreur : " + e.message, "err");
    }
  });

  if ($("caPostTelecharger")) $("caPostTelecharger").addEventListener("click", async () => {
    if (!postCanvas) return;
    const blob = await new Promise(res => postCanvas.toBlob(res, "image/png"));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "post-promo.png";
    a.click();
    URL.revokeObjectURL(url);
  });

  if ($("caPostCopier")) $("caPostCopier").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("caPostTexte").value);
      statusC("Texte copié !", "ok");
    } catch (e) {
      statusC("Impossible de copier automatiquement, sélectionne et copie manuellement.", "err");
    }
  });

  // ---------- Chargement du quiz choisi ----------
  document.querySelectorAll('.adm-tab[data-tab="carousels"]').forEach(t => {
    t.addEventListener("click", () => { if (window.DB) chargerListeQuiz(); });
  });

  async function chargerListeQuiz() {
    const sel = $("caQuiz");
    if (!sel || typeof DB === "undefined" || !DB) return;
    const { data } = await DB.from("quiz").select("id, titre, matiere, filiere").order("created_at", { ascending: false });
    sel.innerHTML = '<option value="">— Choisir un quiz —</option>'
      + (data || []).map(q => '<option value="' + q.id + '">' + q.titre.replace(/</g, "&lt;") + ' (' + q.matiere + ')</option>').join("");
  }

  let slidesActuelles = [];

  if ($("caGenerer")) $("caGenerer").addEventListener("click", async () => {
    const quizId = $("caQuiz").value;
    if (!quizId) { statusC("Choisis un quiz.", "err"); return; }
    if (typeof DB === "undefined" || !DB) { statusC("Connexion Supabase indisponible.", "err"); return; }

    statusC("Génération des slides…", "");
    $("caGenerer").disabled = true;
    $("caApercu").style.display = "none";

    try {
      const { data: quiz, error: eQ } = await DB.from("quiz").select("*").eq("id", quizId).single();
      if (eQ || !quiz) { statusC("Quiz introuvable.", "err"); return; }
      const { data: questions, error: eQs } = await DB.from("questions").select("*").eq("quiz_id", quizId).order("ordre");
      if (eQs || !questions || !questions.length) { statusC("Ce quiz n'a pas de questions.", "err"); return; }

      if (!logoImg) await chargerLogo();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      slidesActuelles = [];
      slidesActuelles.push(slideIntro(quiz, questions.length));
      questions.forEach((q, i) => slidesActuelles.push(slideQuestion(q, i + 1, questions.length)));
      slidesActuelles.push(slideReponses(questions));

      const zone = $("caSlides");
      zone.innerHTML = "";
      slidesActuelles.forEach((cv, i) => {
        const mini = document.createElement("img");
        mini.src = cv.toDataURL("image/png");
        mini.style.width = "100%";
        mini.style.borderRadius = "10px";
        mini.style.border = "1px solid var(--craie-2)";
        mini.title = i === 0 ? "Intro" : (i === slidesActuelles.length - 1 ? "Réponses" : "Question " + i);
        zone.appendChild(mini);
      });
      $("caApercu").style.display = "block";
      statusC(slidesActuelles.length + " slides générées.", "ok");
    } catch (e) {
      statusC("Erreur : " + e.message, "err");
    } finally {
      $("caGenerer").disabled = false;
    }
  });

  if ($("caTelecharger")) $("caTelecharger").addEventListener("click", async () => {
    if (!slidesActuelles.length || typeof JSZip === "undefined") return;
    statusC("Préparation du zip…", "");
    const zip = new JSZip();
    for (let i = 0; i < slidesActuelles.length; i++) {
      const blob = await new Promise(res => slidesActuelles[i].toBlob(res, "image/png"));
      const nom = i === 0 ? "01-intro.png" : (i === slidesActuelles.length - 1 ? String(i + 1).padStart(2, "0") + "-reponses.png" : String(i + 1).padStart(2, "0") + "-question.png");
      zip.file(nom, blob);
    }
    const contenu = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(contenu);
    const a = document.createElement("a");
    a.href = url; a.download = "carousel-quiz.zip";
    a.click();
    URL.revokeObjectURL(url);
    statusC("Zip téléchargé.", "ok");
  });
})();

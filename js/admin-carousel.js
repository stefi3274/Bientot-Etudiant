/* ============================================================
   Admin — génération de carousels TikTok/Instagram depuis un
   Quiz à Gogo. Format carré 1080×1080 (standard Instagram), 12
   slides max : 1 intro + 10 questions + 1 corrigé. Fond = couleur
   de la matière, texte noir, grandes polices, cartes blanches
   pour les choix (lisibilité garantie sur toutes les couleurs).
   Le "Post promo Facebook/WhatsApp" utilise le même système.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const statusC = (m, t) => { const el = $("caMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  const T = 1080; // carré, standard Instagram/TikTok
  const MAX_QUESTIONS = 10; // + 1 intro + 1 corrigé = 12 slides max
  const NOIR = "#161616";
  const BLANC = "#ffffff";

  const FILIERES = { f1: "Médecine, Agronomie & Vétérinaire", f2: "Sciences administratives, Économie & Génie", f3: "Sciences humaines et sociales" };
  const COULEUR_MATIERE = {
    "Mathématiques": "#3b6ea5", "Physique": "#e07a3c", "Chimie": "#c94f4f", "Biologie": "#3fa06a",
    "Botanique": "#5a8f3c", "Français": "#8257b5", "Philosophie": "#5b5fc7", "Culture générale": "#3aa5b0",
    "Créole": "#d98a4b", "Économie et Gestion": "#b8863b", "Droit": "#6d5a8f"
  };
  const couleurMatiere = m => COULEUR_MATIERE[m] || "#4a5f73";

  let logoImg = null;
  function chargerLogo() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { logoImg = img; resolve(); };
      img.onerror = () => resolve();
      img.src = "img/logo.png";
    });
  }

  function decouperTexte(ctx, texte, maxWidth) {
    const mots = (texte || "").split(/\s+/);
    const lignes = [];
    let ligne = "";
    mots.forEach(mot => {
      const essai = ligne ? ligne + " " + mot : mot;
      if (ctx.measureText(essai).width > maxWidth && ligne) { lignes.push(ligne); ligne = mot; }
      else ligne = essai;
    });
    if (ligne) lignes.push(ligne);
    return lignes;
  }

  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }

  // ---------- Fond plein : couleur de la matière ----------
  function fondCommun(ctx, couleur) {
    ctx.fillStyle = couleur;
    ctx.fillRect(0, 0, T, T);
  }

  function piedDePage(ctx) {
    const y = T - 58;
    ctx.strokeStyle = "rgba(22,22,22,.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(64, y - 32); ctx.lineTo(T - 64, y - 32); ctx.stroke();

    if (logoImg) ctx.drawImage(logoImg, 64, y - 13, 34, 42);
    ctx.fillStyle = NOIR;
    ctx.font = "700 26px Fraunces, Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Bientôt Étudiant", logoImg ? 110 : 64, y + 8);
    ctx.font = "600 19px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(22,22,22,.75)";
    ctx.textAlign = "right";
    ctx.fillText("bientot-etudiant.vercel.app", T - 64, y + 8);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // Pastille blanche, bordure + texte noirs — lisible sur n'importe quelle couleur de fond
  function pastille(ctx, texte, x, y, taillePolice) {
    ctx.font = "800 " + (taillePolice || 24) + "px Inter, system-ui, sans-serif";
    const w = ctx.measureText(texte).width + 38;
    const h = (taillePolice || 24) + 24;
    ctx.fillStyle = BLANC;
    rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, h / 2); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textBaseline = "middle";
    ctx.fillText(texte, x + 19, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
    return w;
  }

  // Badge circulaire lettré — cercle blanc, contour et lettre noirs
  function badgeLettre(ctx, x, y, r, lettre) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = BLANC; ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.font = "800 " + Math.round(r * 0.95) + "px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(lettre, x, y + 1);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Slide 1/12 : couverture ----------
  function slideIntro(quiz, nbQ) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(quiz.matiere);
    fondCommun(ctx, couleur);

    ctx.font = "800 23px Inter, system-ui, sans-serif";
    ctx.fillStyle = NOIR;
    ctx.fillText("CONCOURS D'ENTRÉE À L'UNIVERSITÉ", 64, 108);

    pastille(ctx, FILIERES[quiz.filiere] || quiz.filiere || "", 64, 140, 21);
    pastille(ctx, quiz.matiere || "", 64, 200, 21);

    ctx.fillStyle = NOIR;
    ctx.font = "800 72px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, quiz.titre, T - 128);
    let y = 400;
    lignesTitre.slice(0, 4).forEach(l => { ctx.fillText(l, 64, y); y += 80; });

    pastille(ctx, nbQ + " questions", 64, y + 40, 24);

    // Message d'appel à l'action (lien en bio)
    const cta_y = T - 260;
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 118, 20); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 118, 20); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 30px Inter, system-ui, sans-serif";
    ctx.fillText("Pour plus de quiz,", T / 2, cta_y + 46);
    ctx.fillText("clique sur le lien en bio 👆", T / 2, cta_y + 86);
    ctx.textAlign = "left";

    piedDePage(ctx);
    return cv;
  }

  // ---------- Slides question (2 à 11 sur 12) ----------
  function slideQuestion(q, index, total, matiere) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(matiere);
    fondCommun(ctx, couleur);

    const wPastille = pastille(ctx, "QUESTION " + index + " / " + total, 64, 66, 22);
    pastille(ctx, matiere || "", 64 + wPastille + 12, 66, 22);

    ctx.fillStyle = NOIR;
    ctx.font = "800 54px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, q.enonce, T - 128);
    let y = 230;
    lignes.slice(0, 4).forEach(l => { ctx.fillText(l, 64, y); y += 62; });

    // Zone des choix : position fixe pour garantir zéro débordement, quelle que soit la longueur de l'énoncé
    const choix = [["A", q.choix_a], ["B", q.choix_b], ["C", q.choix_c], ["D", q.choix_d]];
    const rowH = 112, startY = 500;
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    choix.forEach(([lettre, texte], i) => {
      const ry = startY + i * rowH;
      ctx.fillStyle = BLANC;
      rr(ctx, 64, ry, T - 128, rowH - 14, 16); ctx.fill();

      badgeLettre(ctx, 110, ry + (rowH - 14) / 2, 27, lettre);

      ctx.fillStyle = NOIR;
      const ligneTxt = decouperTexte(ctx, texte || "", T - 128 - 130);
      ctx.textBaseline = "middle";
      ctx.fillText(ligneTxt[0] || "", 158, ry + (rowH - 14) / 2 + 1);
      ctx.textBaseline = "alphabetic";
    });

    piedDePage(ctx);
    return cv;
  }

  // ---------- Slide 12/12 : corrigé ----------
  function slideReponses(questions, matiere) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(matiere);
    fondCommun(ctx, couleur);

    pastille(ctx, "CORRIGÉ", 64, 66, 22);
    ctx.fillStyle = NOIR;
    ctx.font = "800 60px Fraunces, Georgia, serif";
    ctx.fillText("Tu as tout bon ?", 64, 220);

    const parCol = Math.ceil(questions.length / 2);
    const colW = (T - 128 - 30) / 2;
    ctx.font = "700 30px Inter, system-ui, sans-serif";
    questions.forEach((q, i) => {
      const col = i < parCol ? 0 : 1;
      const ligne = i < parCol ? i : i - parCol;
      const x = 64 + col * (colW + 30);
      const yy = 300 + ligne * 84;
      badgeLettre(ctx, x + 28, yy, 26, (q.bonne || "").toUpperCase());
      ctx.fillStyle = NOIR;
      ctx.textBaseline = "middle";
      ctx.fillText("Question " + (i + 1), x + 72, yy + 1);
      ctx.textBaseline = "alphabetic";
    });

    const cta_y = T - 230;
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 100, 20); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 100, 20); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 28px Inter, system-ui, sans-serif";
    ctx.fillText("Pour le quiz complet, lien en bio 👆", T / 2, cta_y + 58);
    ctx.textAlign = "left";

    piedDePage(ctx);
    return cv;
  }

  // ---------- Post promo Facebook/WhatsApp (même système visuel) ----------
  function slidePromo(quiz) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(quiz.matiere);
    fondCommun(ctx, couleur);

    pastille(ctx, "NOUVEAU QUIZ", 64, 120, 23);

    ctx.fillStyle = NOIR;
    ctx.font = "800 66px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, quiz.titre, T - 128);
    let y = 320;
    lignes.slice(0, 4).forEach(l => { ctx.fillText(l, 64, y); y += 76; });

    ctx.fillStyle = "rgba(22,22,22,.8)";
    ctx.font = "700 30px Inter, system-ui, sans-serif";
    ctx.fillText((FILIERES[quiz.filiere] || quiz.filiere || "") + " · " + (quiz.matiere || ""), 64, y + 26);

    const cta_y = T - 220;
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 100, 20); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 100, 20); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 28px Inter, system-ui, sans-serif";
    ctx.fillText("Teste tes connaissances →", T / 2, cta_y + 58);
    ctx.textAlign = "left";

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
    t.addEventListener("click", () => { if (typeof DB !== "undefined" && DB) chargerListeQuiz(); });
  });

  async function chargerListeQuiz() {
    const sel = $("caQuiz");
    if (!sel || typeof DB === "undefined" || !DB) return;
    const { data } = await DB.from("quiz").select("id, titre, matiere, filiere").eq("type", "gogo").order("created_at", { ascending: false });
    sel.innerHTML = '<option value="">— Choisir un Quiz à Gogo —</option>'
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
      const { data: toutesQuestions, error: eQs } = await DB.from("questions").select("*").eq("quiz_id", quizId).order("ordre");
      if (eQs || !toutesQuestions || !toutesQuestions.length) { statusC("Ce quiz n'a pas de questions.", "err"); return; }

      const questions = toutesQuestions.slice(0, MAX_QUESTIONS);

      if (!logoImg) await chargerLogo();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      slidesActuelles = [];
      slidesActuelles.push(slideIntro(quiz, questions.length));
      questions.forEach((q, i) => slidesActuelles.push(slideQuestion(q, i + 1, questions.length, quiz.matiere)));
      slidesActuelles.push(slideReponses(questions, quiz.matiere));

      const zone = $("caSlides");
      zone.innerHTML = "";
      slidesActuelles.forEach((cv, i) => {
        const mini = document.createElement("img");
        mini.src = cv.toDataURL("image/png");
        mini.style.width = "100%";
        mini.style.borderRadius = "10px";
        mini.style.border = "1px solid var(--craie-2)";
        mini.title = i === 0 ? "Intro" : (i === slidesActuelles.length - 1 ? "Corrigé" : "Question " + i);
        zone.appendChild(mini);
      });
      $("caApercu").style.display = "block";
      const note = toutesQuestions.length > MAX_QUESTIONS
        ? " (" + questions.length + " premières sur " + toutesQuestions.length + " au total, limité pour TikTok)"
        : "";
      statusC(slidesActuelles.length + " slides générées" + note + ".", "ok");
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
      const nom = i === 0 ? "01-intro.png" : (i === slidesActuelles.length - 1 ? String(i + 1).padStart(2, "0") + "-corrige.png" : String(i + 1).padStart(2, "0") + "-question.png");
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

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
    "Botanique": "#5a8f3c", "Français": "#a78bda", "Philosophie": "#5b5fc7", "Culture générale": "#3aa5b0",
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

    ctx.font = "800 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = NOIR;
    ctx.fillText("CONCOURS D'ENTRÉE À L'UNIVERSITÉ", 64, 108);

    pastille(ctx, FILIERES[quiz.filiere] || quiz.filiere || "", 64, 142, 22);
    pastille(ctx, quiz.matiere || "", 64, 204, 22);

    ctx.fillStyle = NOIR;
    ctx.font = "800 80px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, quiz.titre, T - 128);
    let y = 410;
    lignesTitre.slice(0, 4).forEach(l => { ctx.fillText(l, 64, y); y += 88; });

    pastille(ctx, nbQ + " questions", 64, y + 44, 26);
    const finContenu = y + 44 + 74;

    // Message d'appel à l'action (lien en bio) — remonte si le titre est court, jamais plus bas que la zone sûre
    const cta_y = Math.min(finContenu + 50, T - 250);
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 126, 22); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 126, 22); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 32px Inter, system-ui, sans-serif";
    ctx.fillText("Pour plus de quiz,", T / 2, cta_y + 50);
    ctx.fillText("clique sur le lien en bio 👆", T / 2, cta_y + 92);
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

    const wPastille = pastille(ctx, "QUESTION " + index + " / " + total, 64, 64, 23);
    pastille(ctx, matiere || "", 64 + wPastille + 12, 64, 23);

    ctx.fillStyle = NOIR;
    ctx.font = "800 60px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, q.enonce, T - 128);
    let y = 220;
    lignes.slice(0, 4).forEach(l => { ctx.fillText(l, 64, y); y += 68; });

    // Zone des choix : quatre rangées pleine largeur qui s'étirent jusqu'au pied de page —
    // presque plus d'espace vide en bas, tout en restant sûr contre le débordement.
    const choix = [["A", q.choix_a], ["B", q.choix_b], ["C", q.choix_c], ["D", q.choix_d]];
    const startY = Math.min(y + 60, 470);
    const zoneBas = T - 130; // juste au-dessus du pied de page
    const rowGap = 14;
    const rowH = (zoneBas - startY) / 4;
    ctx.font = "700 36px Inter, system-ui, sans-serif";
    choix.forEach(([lettre, texte], i) => {
      const ry = startY + i * rowH;
      const hBox = rowH - rowGap;
      ctx.fillStyle = BLANC;
      rr(ctx, 64, ry, T - 128, hBox, 18); ctx.fill();

      badgeLettre(ctx, 114, ry + hBox / 2, 30, lettre);

      ctx.fillStyle = NOIR;
      const ligneTxt = decouperTexte(ctx, texte || "", T - 128 - 140);
      ctx.textBaseline = "middle";
      ctx.fillText(ligneTxt[0] || "", 166, ry + hBox / 2 + 1);
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

    pastille(ctx, "CORRIGÉ", 64, 64, 23);
    ctx.fillStyle = NOIR;
    ctx.font = "800 64px Fraunces, Georgia, serif";
    ctx.fillText("Tu as tout bon ?", 64, 228);

    const parCol = Math.ceil(questions.length / 2);
    const colW = (T - 128 - 32) / 2;
    const startY = 320, zoneBas = T - 300;
    const rowH = (zoneBas - startY) / parCol;
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    questions.forEach((q, i) => {
      const col = i < parCol ? 0 : 1;
      const ligne = i < parCol ? i : i - parCol;
      const x = 64 + col * (colW + 32);
      const yy = startY + ligne * rowH;
      badgeLettre(ctx, x + 30, yy, 28, (q.bonne || "").toUpperCase());
      ctx.fillStyle = NOIR;
      ctx.textBaseline = "middle";
      ctx.fillText("Question " + (i + 1), x + 76, yy + 1);
      ctx.textBaseline = "alphabetic";
    });

    const cta_y = T - 250;
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 116, 22); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 116, 22); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 30px Inter, system-ui, sans-serif";
    ctx.fillText("Pour le quiz complet,", T / 2, cta_y + 46);
    ctx.fillText("lien en bio 👆", T / 2, cta_y + 86);
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

  /* ============================================================
     CAROUSEL DE LEÇON — 12 slides max : 1 couverture + jusqu'à 10
     fiches + 1 page de fin (rejoindre la communauté / faire le quiz).
     Réutilise le même système visuel (fond matière, texte noir).
     ============================================================ */
  const MAX_FICHES = 10;
  const statusCL = (m, t) => { const el = $("calMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  function extraireFiches(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    const blocs = tmp.querySelectorAll(".fiche");
    const fiches = [];
    blocs.forEach(bloc => {
      const h3 = bloc.querySelector("h3");
      const titre = h3 ? h3.textContent.trim() : "";
      const paras = [...bloc.querySelectorAll("p, li")].map(p => p.textContent.trim()).filter(Boolean);
      fiches.push({ titre, texte: paras.join(" ") });
    });
    return fiches;
  }

  function slideLeconCouverture(lecon, nbFiches) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(lecon.matiere);
    fondCommun(ctx, couleur);

    ctx.font = "800 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = NOIR;
    ctx.fillText("LEÇON · CONCOURS D'ENTRÉE", 64, 108);

    pastille(ctx, FILIERES[lecon.filiere] || lecon.filiere || "", 64, 142, 22);
    pastille(ctx, lecon.matiere || "", 64, 204, 22);

    ctx.fillStyle = NOIR;
    ctx.font = "800 76px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, lecon.titre, T - 128);
    let y = 400;
    lignesTitre.slice(0, 4).forEach(l => { ctx.fillText(l, 64, y); y += 84; });

    if (lecon.apercu) {
      ctx.font = "600 30px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(22,22,22,.8)";
      const lignesAp = decouperTexte(ctx, lecon.apercu, T - 128);
      lignesAp.slice(0, 3).forEach(l => { ctx.fillText(l, 64, y + 12); y += 42; });
    }

    pastille(ctx, nbFiches + " fiches à réviser", 64, y + 34, 24);
    const finContenu = y + 34 + 76;

    const cta_y = Math.min(finContenu + 46, T - 250);
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 126, 22); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 126, 22); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 32px Inter, system-ui, sans-serif";
    ctx.fillText("Pour plus de leçons,", T / 2, cta_y + 50);
    ctx.fillText("clique sur le lien en bio 👆", T / 2, cta_y + 92);
    ctx.textAlign = "left";

    piedDePage(ctx);
    return cv;
  }

  function slideFiche(fiche, index, total, matiere) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(matiere);
    fondCommun(ctx, couleur);

    const wPastille = pastille(ctx, "FICHE " + index + " / " + total, 64, 64, 23);
    pastille(ctx, matiere || "", 64 + wPastille + 12, 64, 23);

    ctx.fillStyle = NOIR;
    ctx.font = "800 52px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, fiche.titre, T - 128);
    let y = 232;
    lignesTitre.slice(0, 3).forEach(l => { ctx.fillText(l, 64, y); y += 60; });

    // Boîte de texte : dimensionnée pour le contenu réel (pas étirée jusqu'en bas),
    // puis centrée dans l'espace restant — quasiment plus d'espace blanc inutilisé.
    const zoneHaut = y + 20, zoneBas = T - 130;
    const padding = 44, tailleTexte = 42, ligneHauteur = 54;
    ctx.font = "600 " + tailleTexte + "px Inter, system-ui, sans-serif";
    const largeurTexte = T - 128 - padding * 2;
    let lignesTexte = decouperTexte(ctx, fiche.texte, largeurTexte);

    const maxLignesPossibles = Math.max(3, Math.floor((zoneBas - zoneHaut - padding * 2) / ligneHauteur));
    if (lignesTexte.length > maxLignesPossibles) lignesTexte = lignesTexte.slice(0, maxLignesPossibles);

    const boiteHauteur = Math.min(zoneBas - zoneHaut, padding * 2 + lignesTexte.length * ligneHauteur);
    const boiteY = zoneHaut + Math.max(0, (zoneBas - zoneHaut - boiteHauteur) / 2);

    ctx.fillStyle = BLANC;
    rr(ctx, 64, boiteY, T - 128, boiteHauteur, 22); ctx.fill();
    ctx.strokeStyle = "rgba(22,22,22,.15)"; ctx.lineWidth = 1.5;
    rr(ctx, 64, boiteY, T - 128, boiteHauteur, 22); ctx.stroke();

    ctx.fillStyle = NOIR;
    let ty = boiteY + padding + tailleTexte * 0.72;
    lignesTexte.forEach(l => { ctx.fillText(l, 64 + padding, ty); ty += ligneHauteur; });

    piedDePage(ctx);
    return cv;
  }

  function slideLeconFin(lecon) {
    const cv = document.createElement("canvas"); cv.width = T; cv.height = T;
    const ctx = cv.getContext("2d");
    const couleur = couleurMatiere(lecon.matiere);
    fondCommun(ctx, couleur);

    pastille(ctx, "REJOINS-NOUS", 64, 88, 23);

    ctx.fillStyle = NOIR;
    ctx.font = "800 64px Fraunces, Georgia, serif";
    let y = 268;
    ["Rejoins la", "communauté !"].forEach(l => { ctx.fillText(l, 64, y); y += 72; });

    ctx.font = "600 31px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(22,22,22,.85)";
    const lignes = decouperTexte(ctx, "Crée un compte gratuit pour suivre ta progression, garder ta série de révision, et tester ce que tu viens d'apprendre.", T - 128);
    y += 30;
    lignes.forEach(l => { ctx.fillText(l, 64, y); y += 42; });

    const cta_y = T - 310;
    ctx.fillStyle = BLANC;
    rr(ctx, 64, cta_y, T - 128, 110, 22); ctx.fill();
    ctx.strokeStyle = NOIR; ctx.lineWidth = 2; rr(ctx, 64, cta_y, T - 128, 110, 22); ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.font = "800 30px Inter, system-ui, sans-serif";
    ctx.fillText("Fais le quiz de cette leçon 👉", T / 2, cta_y + 64);
    ctx.textAlign = "left";

    const cta2_y = T - 180;
    ctx.fillStyle = NOIR;
    rr(ctx, 64, cta2_y, T - 128, 100, 22); ctx.fill();
    ctx.fillStyle = BLANC;
    ctx.textAlign = "center";
    ctx.font = "800 28px Inter, system-ui, sans-serif";
    ctx.fillText("Lien dans la bio 👆", T / 2, cta2_y + 58);
    ctx.textAlign = "left";

    piedDePage(ctx);
    return cv;
  }

  document.querySelectorAll('.adm-tab[data-tab="carousels"]').forEach(t => {
    t.addEventListener("click", () => { if (typeof DB !== "undefined" && DB) chargerListeLecons(); });
  });

  async function chargerListeLecons() {
    const sel = $("calLecon");
    if (!sel || typeof DB === "undefined" || !DB) return;
    const { data } = await DB.from("lecons").select("id, titre, matiere, filiere").eq("publie", true).order("created_at", { ascending: false });
    sel.innerHTML = '<option value="">— Choisir une leçon —</option>'
      + (data || []).map(l => '<option value="' + l.id + '">' + l.titre.replace(/</g, "&lt;") + ' (' + l.matiere + ')</option>').join("");
  }

  let slidesLeconActuelles = [];

  if ($("calGenerer")) $("calGenerer").addEventListener("click", async () => {
    const leconId = $("calLecon").value;
    if (!leconId) { statusCL("Choisis une leçon.", "err"); return; }
    if (typeof DB === "undefined" || !DB) { statusCL("Connexion Supabase indisponible.", "err"); return; }

    statusCL("Génération des slides…", "");
    $("calGenerer").disabled = true;
    $("calApercu").style.display = "none";

    try {
      const { data: lecon, error } = await DB.from("lecons").select("*").eq("id", leconId).single();
      if (error || !lecon) { statusCL("Leçon introuvable.", "err"); return; }

      const toutesFiches = extraireFiches(lecon.contenu);
      if (!toutesFiches.length) { statusCL("Cette leçon n'est pas en format fiches (voir l'onglet Leçons → Coller la leçon en fiches).", "err"); return; }
      const fiches = toutesFiches.slice(0, MAX_FICHES);

      if (!logoImg) await chargerLogo();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      slidesLeconActuelles = [];
      slidesLeconActuelles.push(slideLeconCouverture(lecon, fiches.length));
      fiches.forEach((f, i) => slidesLeconActuelles.push(slideFiche(f, i + 1, fiches.length, lecon.matiere)));
      slidesLeconActuelles.push(slideLeconFin(lecon));

      const zone = $("calSlides");
      zone.innerHTML = "";
      slidesLeconActuelles.forEach((cv, i) => {
        const mini = document.createElement("img");
        mini.src = cv.toDataURL("image/png");
        mini.style.width = "100%";
        mini.style.borderRadius = "10px";
        mini.style.border = "1px solid var(--craie-2)";
        mini.title = i === 0 ? "Couverture" : (i === slidesLeconActuelles.length - 1 ? "Page de fin" : "Fiche " + i);
        zone.appendChild(mini);
      });
      $("calApercu").style.display = "block";
      const note = toutesFiches.length > MAX_FICHES ? " (" + fiches.length + " premières sur " + toutesFiches.length + ")" : "";
      statusCL(slidesLeconActuelles.length + " slides générées" + note + ".", "ok");
    } catch (e) {
      statusCL("Erreur : " + e.message, "err");
    } finally {
      $("calGenerer").disabled = false;
    }
  });

  if ($("calTelecharger")) $("calTelecharger").addEventListener("click", async () => {
    if (!slidesLeconActuelles.length || typeof JSZip === "undefined") return;
    statusCL("Préparation du zip…", "");
    const zip = new JSZip();
    for (let i = 0; i < slidesLeconActuelles.length; i++) {
      const blob = await new Promise(res => slidesLeconActuelles[i].toBlob(res, "image/png"));
      const nom = i === 0 ? "01-couverture.png" : (i === slidesLeconActuelles.length - 1 ? String(i + 1).padStart(2, "0") + "-fin.png" : String(i + 1).padStart(2, "0") + "-fiche.png");
      zip.file(nom, blob);
    }
    const contenu = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(contenu);
    const a = document.createElement("a");
    a.href = url; a.download = "carousel-lecon.zip";
    a.click();
    URL.revokeObjectURL(url);
    statusCL("Zip téléchargé.", "ok");
  });
})();

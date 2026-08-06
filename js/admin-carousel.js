/* ============================================================
   Admin — génération de carousels TikTok depuis un quiz
   Rendu en Canvas côté client (aucun coût API), export PNG zippés.
   Format vertical 1080×1920 (natif TikTok), 12 slides max :
   1 intro + 10 questions + 1 corrigé. Design éditorial : fond
   ardoise + halo coloré par filière, tag matière dans sa propre
   couleur, badges circulaires, numéros watermark.
   Le "Post promo Facebook/WhatsApp" (1:1) reste inchangé, séparé.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const statusC = (m, t) => { const el = $("caMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  const L = 1080;   // largeur (carrousel vertical ET post promo)
  const H_CAR = 1920; // hauteur carrousel TikTok (9:16)
  const H_PROMO = 1080; // hauteur post promo (1:1, inchangé)
  const MAX_QUESTIONS = 10; // + 1 intro + 1 corrigé = 12 slides max

  const COULEURS = {
    ardoise: "#14342b",
    craie: "#f7f4ec",
    craie2: "#ede8da",
    ocre: "#e8b84b",
    ocreD: "#d4a336"
  };
  const ACCENTS = { f1: "#2a9d6f", f2: "#4a90c4", f3: "#c96b83" };
  const FILIERES = { f1: "Médecine, Agronomie & Vétérinaire", f2: "Sciences administratives, Économie & Génie", f3: "Sciences humaines et sociales" };
  const COULEUR_MATIERE = {
    "Mathématiques": "#3b6ea5", "Physique": "#e07a3c", "Chimie": "#c94f4f", "Biologie": "#3fa06a",
    "Botanique": "#5a8f3c", "Français": "#8257b5", "Philosophie": "#5b5fc7", "Culture générale": "#3aa5b0",
    "Créole": "#d98a4b", "Économie et Gestion": "#b8863b", "Droit": "#6d5a8f"
  };
  const accentDe = f => ACCENTS[f] || COULEURS.ocre;
  const couleurMatiere = m => COULEUR_MATIERE[m] || COULEURS.ocreD;

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

  function hexToRgba(hex, a) {
    const n = parseInt(hex.replace("#", ""), 16);
    return "rgba(" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",") + "," + a + ")";
  }

  // ---------- Fond éditorial : ardoise + halo coloré + liseré ----------
  function fondCommun(ctx, accent, hauteur) {
    ctx.fillStyle = COULEURS.ardoise;
    ctx.fillRect(0, 0, L, hauteur);

    const glow = ctx.createRadialGradient(L * 0.85, hauteur * 0.06, 0, L * 0.85, hauteur * 0.06, hauteur * 0.6);
    glow.addColorStop(0, hexToRgba(accent, 0.30));
    glow.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, L, hauteur);

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, L, 8);
  }

  function piedDePage(ctx, hauteur) {
    const y = hauteur - 64;
    ctx.strokeStyle = "rgba(247,244,236,.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(64, y - 32); ctx.lineTo(L - 64, y - 32); ctx.stroke();

    if (logoImg) ctx.drawImage(logoImg, 64, y - 13, 36, 44);
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 28px Fraunces, Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Bientôt Étudiant", logoImg ? 112 : 64, y + 9);
    ctx.font = "500 20px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.textAlign = "right";
    ctx.fillText("bientot-etudiant.vercel.app", L - 64, y + 9);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // Pastille (tag) avec fond accent — retourne sa largeur pour en placer une autre à côté
  function pastille(ctx, texte, x, y, accent, taillePolice, texteFonce) {
    ctx.font = "700 " + (taillePolice || 24) + "px Inter, system-ui, sans-serif";
    const w = ctx.measureText(texte).width + 40;
    const h = (taillePolice || 24) + 26;
    ctx.fillStyle = accent;
    rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = texteFonce ? "rgba(20,52,43,.85)" : COULEURS.craie;
    ctx.textBaseline = "middle";
    ctx.fillText(texte, x + 20, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
    return w;
  }

  // Grand numéro/symbole filigrane décoratif
  function watermark(ctx, texte, x, y, accent, taille) {
    ctx.font = "700 " + (taille || 380) + "px Fraunces, Georgia, serif";
    ctx.fillStyle = hexToRgba(accent, 0.10);
    ctx.fillText(texte, x, y);
  }

  // Badge circulaire lettré (A/B/C/D)
  function badgeLettre(ctx, x, y, r, lettre, accent, plein) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (plein) { ctx.fillStyle = accent; ctx.fill(); }
    else { ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.fillStyle = plein ? COULEURS.craie : accent;
    ctx.font = "700 28px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(lettre, x, y + 1);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Slide 1/12 : couverture ----------
  function slideIntro(quiz, nbQ) {
    const cv = document.createElement("canvas"); cv.width = L; cv.height = H_CAR;
    const ctx = cv.getContext("2d");
    const accent = accentDe(quiz.filiere);
    const accentMat = couleurMatiere(quiz.matiere);
    fondCommun(ctx, accent, H_CAR);
    watermark(ctx, "?", L - 240, 560, accent, 420);

    ctx.font = "700 26px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.fillText("CONCOURS D'ENTRÉE À L'UNIVERSITÉ", 80, 140);

    // Pastilles filière + matière, l'une sous l'autre pour ne jamais déborder en largeur
    pastille(ctx, FILIERES[quiz.filiere] || quiz.filiere || "", 80, 180, accent, 22);
    pastille(ctx, quiz.matiere || "", 80, 244, accentMat, 22);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 84px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, quiz.titre, L - 160);
    let y = 480;
    lignesTitre.slice(0, 4).forEach(l => { ctx.fillText(l, 80, y); y += 96; });

    const py = y + 50;
    ctx.fillStyle = COULEURS.craie2;
    const w = ctx.measureText(nbQ + " questions").width;
    ctx.font = "700 28px Inter, system-ui, sans-serif";
    rr(ctx, 80, py, w + 48, 78, 39); ctx.fill();
    ctx.fillStyle = "rgba(20,52,43,.85)";
    ctx.textBaseline = "middle";
    ctx.fillText(nbQ + " questions", 104, py + 41);
    ctx.textBaseline = "alphabetic";

    // Message d'appel à l'action (lien en bio)
    const cta_y = H_CAR - 330;
    ctx.fillStyle = accentMat;
    rr(ctx, 80, cta_y, L - 160, 128, 20); ctx.fill();
    ctx.fillStyle = COULEURS.craie;
    ctx.textAlign = "center";
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    ctx.fillText("Pour plus de quiz,", L / 2, cta_y + 48);
    ctx.fillText("clique sur le lien en bio 👆", L / 2, cta_y + 92);
    ctx.textAlign = "left";

    // flèche "swipe"
    const ay = H_CAR - 150;
    ctx.strokeStyle = COULEURS.craie; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(80, ay); ctx.lineTo(220, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, ay - 14); ctx.lineTo(220, ay); ctx.lineTo(200, ay + 14); ctx.stroke();
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText("Fais défiler pour jouer", 240, ay + 10);

    piedDePage(ctx, H_CAR);
    return cv;
  }

  // ---------- Slides question (2 à 11 sur 12) ----------
  function slideQuestion(q, index, total, filiere, matiere) {
    const cv = document.createElement("canvas"); cv.width = L; cv.height = H_CAR;
    const ctx = cv.getContext("2d");
    const accent = accentDe(filiere);
    const accentMat = couleurMatiere(matiere);
    fondCommun(ctx, accent, H_CAR);
    watermark(ctx, String(index).padStart(2, "0"), 40, 420, accent, 380);

    const wPastille = pastille(ctx, "QUESTION " + index + " / " + total, 80, 90, accent, 24);
    pastille(ctx, matiere || "", 80 + wPastille + 14, 90, accentMat, 24);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 60px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, q.enonce, L - 160);
    let y = 320;
    lignes.slice(0, 5).forEach(l => { ctx.fillText(l, 80, y); y += 70; });

    const choix = [["A", q.choix_a], ["B", q.choix_b], ["C", q.choix_c], ["D", q.choix_d]];
    let cy = Math.max(y + 90, 820);
    ctx.font = "500 34px Inter, system-ui, sans-serif";
    choix.forEach(([lettre, texte]) => {
      const ligneTxt = decouperTexte(ctx, texte || "", L - 280);
      const nbLignes = Math.min(ligneTxt.length, 2);
      const rowH = nbLignes > 1 ? 130 : 96;

      badgeLettre(ctx, 120, cy + (nbLignes > 1 ? 30 : 0), 32, lettre, accent, false);
      ctx.fillStyle = COULEURS.craie;
      ctx.textBaseline = "middle";
      ligneTxt.slice(0, 2).forEach((l, li) => { ctx.fillText(l, 178, cy + li * 42); });
      ctx.textBaseline = "alphabetic";

      if (lettre !== "D") {
        ctx.strokeStyle = "rgba(247,244,236,.14)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(80, cy + rowH - 20); ctx.lineTo(L - 80, cy + rowH - 20); ctx.stroke();
      }
      cy += rowH;
    });

    piedDePage(ctx, H_CAR);
    return cv;
  }

  // ---------- Slide 12/12 : corrigé (des 10 questions montrées) ----------
  function slideReponses(questions, filiere, matiere) {
    const cv = document.createElement("canvas"); cv.width = L; cv.height = H_CAR;
    const ctx = cv.getContext("2d");
    const accent = accentDe(filiere);
    const accentMat = couleurMatiere(matiere);
    fondCommun(ctx, accent, H_CAR);
    watermark(ctx, "✓", L - 260, 480, accent, 380);

    pastille(ctx, "CORRIGÉ", 80, 90, accentMat, 24);
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 68px Fraunces, Georgia, serif";
    ctx.fillText("Tu as tout bon ?", 80, 260);

    const parCol = Math.ceil(questions.length / 2);
    const colW = (L - 160 - 40) / 2;
    ctx.font = "600 32px Inter, system-ui, sans-serif";
    questions.forEach((q, i) => {
      const col = i < parCol ? 0 : 1;
      const ligne = i < parCol ? i : i - parCol;
      const x = 80 + col * (colW + 40);
      const yy = 380 + ligne * 96;
      badgeLettre(ctx, x + 32, yy, 30, (q.bonne || "").toUpperCase(), accentMat, true);
      ctx.fillStyle = "rgba(247,244,236,.85)";
      ctx.textBaseline = "middle";
      ctx.fillText("Question " + (i + 1), x + 82, yy + 1);
      ctx.textBaseline = "alphabetic";
    });

    const cta_y = H_CAR - 330;
    ctx.fillStyle = accent;
    rr(ctx, 80, cta_y, L - 160, 128, 20); ctx.fill();
    ctx.fillStyle = COULEURS.craie;
    ctx.textAlign = "center";
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    ctx.fillText("Pour le quiz complet,", L / 2, cta_y + 48);
    ctx.fillText("clique sur le lien en bio 👆", L / 2, cta_y + 92);
    ctx.textAlign = "left";

    piedDePage(ctx, H_CAR);
    return cv;
  }

  // ---------- Post promo Facebook/WhatsApp (1:1, inchangé) ----------
  function slidePromo(quiz) {
    const cv = document.createElement("canvas"); cv.width = L; cv.height = H_PROMO;
    const ctx = cv.getContext("2d");
    const accent = accentDe(quiz.filiere);
    fondCommun(ctx, accent, H_PROMO);
    watermark(ctx, "!", 60, 340, accent, 340);

    pastille(ctx, "NOUVEAU QUIZ", 80, 130, accent, 24);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 72px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, quiz.titre, L - 160);
    let y = 320;
    lignes.slice(0, 4).forEach(l => { ctx.fillText(l, 80, y); y += 82; });

    ctx.fillStyle = "rgba(247,244,236,.72)";
    ctx.font = "500 32px Inter, system-ui, sans-serif";
    ctx.fillText((FILIERES[quiz.filiere] || quiz.filiere || "") + " · " + (quiz.matiere || ""), 80, y + 30);

    const ay = H_PROMO - 150;
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(80, ay); ctx.lineTo(220, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, ay - 14); ctx.lineTo(220, ay); ctx.lineTo(200, ay + 14); ctx.stroke();
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText("Teste tes connaissances", 240, ay + 10);

    piedDePage(ctx, H_PROMO);
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
      const { data: toutesQuestions, error: eQs } = await DB.from("questions").select("*").eq("quiz_id", quizId).order("ordre");
      if (eQs || !toutesQuestions || !toutesQuestions.length) { statusC("Ce quiz n'a pas de questions.", "err"); return; }

      const questions = toutesQuestions.slice(0, MAX_QUESTIONS);

      if (!logoImg) await chargerLogo();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      slidesActuelles = [];
      slidesActuelles.push(slideIntro(quiz, questions.length));
      questions.forEach((q, i) => slidesActuelles.push(slideQuestion(q, i + 1, questions.length, quiz.filiere, quiz.matiere)));
      slidesActuelles.push(slideReponses(questions, quiz.filiere, quiz.matiere));

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

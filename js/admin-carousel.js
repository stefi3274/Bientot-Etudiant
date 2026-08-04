/* ============================================================
   Admin — génération de carousels (TikTok/Instagram) depuis un quiz
   Rendu en Canvas côté client (aucun coût API), export PNG zippés.
   Design éditorial : fond ardoise + halo coloré, accent par filière,
   badges circulaires, numéros watermark, grille de corrigé.
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
    ocreD: "#d4a336"
  };
  const ACCENTS = { f1: "#2a9d6f", f2: "#4a90c4", f3: "#c96b83" };
  const FILIERES = { f1: "Médecine, Agronomie & Vétérinaire", f2: "Sciences administratives, Économie & Génie", f3: "Sciences humaines et sociales" };
  const accentDe = f => ACCENTS[f] || COULEURS.ocre;

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
  function fondCommun(ctx, accent) {
    ctx.fillStyle = COULEURS.ardoise;
    ctx.fillRect(0, 0, TAILLE, TAILLE);

    const glow = ctx.createRadialGradient(TAILLE * 0.85, TAILLE * 0.08, 0, TAILLE * 0.85, TAILLE * 0.08, TAILLE * 0.75);
    glow.addColorStop(0, hexToRgba(accent, 0.28));
    glow.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, TAILLE, TAILLE);

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, TAILLE, 8);
  }

  function piedDePage(ctx) {
    const y = TAILLE - 58;
    ctx.strokeStyle = "rgba(247,244,236,.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, y - 30); ctx.lineTo(TAILLE - 60, y - 30); ctx.stroke();

    if (logoImg) ctx.drawImage(logoImg, 60, y - 12, 34, 41);
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 26px Fraunces, Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText("Bientôt Étudiant", logoImg ? 104 : 60, y + 8);
    ctx.font = "500 19px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.textAlign = "right";
    ctx.fillText("bientot-etudiant.vercel.app", TAILLE - 60, y + 8);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // Pastille (tag) avec fond accent
  function pastille(ctx, texte, x, y, accent, taillePolice) {
    ctx.font = "700 " + (taillePolice || 24) + "px Inter, system-ui, sans-serif";
    const w = ctx.measureText(texte).width + 40;
    const h = (taillePolice || 24) + 26;
    ctx.fillStyle = accent;
    rr(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = COULEURS.craie;
    ctx.textBaseline = "middle";
    ctx.fillText(texte, x + 20, y + h / 2 + 1);
    ctx.textBaseline = "alphabetic";
    return w;
  }

  // Grand numéro/symbole filigrane décoratif
  function watermark(ctx, texte, x, y, accent) {
    ctx.font = "700 340px Fraunces, Georgia, serif";
    ctx.fillStyle = hexToRgba(accent, 0.10);
    ctx.fillText(texte, x, y);
  }

  // Badge circulaire lettré (A/B/C/D)
  function badgeLettre(ctx, x, y, r, lettre, accent, plein) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (plein) { ctx.fillStyle = accent; ctx.fill(); }
    else { ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.stroke(); }
    ctx.fillStyle = plein ? COULEURS.craie : accent;
    ctx.font = "700 26px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(lettre, x, y + 1);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Slide 1 : couverture ----------
  function slideIntro(quiz, nbQ) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    const accent = accentDe(quiz.filiere);
    fondCommun(ctx, accent);
    watermark(ctx, "?", TAILLE - 220, 340, accent);

    ctx.font = "700 24px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.fillText("CONCOURS D'ENTRÉE À L'UNIVERSITÉ", 80, 130);

    pastille(ctx, FILIERES[quiz.filiere] || quiz.filiere || "", 80, 165, accent, 22);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 78px Fraunces, Georgia, serif";
    const lignesTitre = decouperTexte(ctx, quiz.titre, TAILLE - 160);
    let y = 400;
    lignesTitre.slice(0, 4).forEach(l => { ctx.fillText(l, 80, y); y += 88; });

    ctx.fillStyle = "rgba(247,244,236,.7)";
    ctx.font = "500 32px Inter, system-ui, sans-serif";
    ctx.fillText(quiz.matiere || "", 80, y + 28);

    const py = y + 80;
    ctx.fillStyle = COULEURS.craie2;
    const w = ctx.measureText(nbQ + " questions").width;
    rr(ctx, 80, py, w + 44, 74, 37); ctx.fill();
    ctx.font = "700 26px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(20,52,43,.85)";
    ctx.textBaseline = "middle";
    ctx.fillText(nbQ + " questions", 102, py + 39);
    ctx.textBaseline = "alphabetic";

    // flèche "swipe"
    const ay = TAILLE - 130;
    ctx.strokeStyle = COULEURS.craie; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(80, ay); ctx.lineTo(220, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, ay - 14); ctx.lineTo(220, ay); ctx.lineTo(200, ay + 14); ctx.stroke();
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText("Fais défiler pour jouer", 240, ay + 10);

    piedDePage(ctx);
    return cv;
  }

  // ---------- Slides question ----------
  function slideQuestion(q, index, total, filiere) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    const accent = accentDe(filiere);
    fondCommun(ctx, accent);
    watermark(ctx, String(index).padStart(2, "0"), 40, 300, accent);

    pastille(ctx, "QUESTION " + index + " / " + total, 80, 70, accent, 22);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 54px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, q.enonce, TAILLE - 160);
    let y = 240;
    lignes.slice(0, 5).forEach(l => { ctx.fillText(l, 80, y); y += 62; });

    const choix = [["A", q.choix_a], ["B", q.choix_b], ["C", q.choix_c], ["D", q.choix_d]];
    let cy = Math.max(y + 60, 540);
    const rowH = 92;
    choix.forEach(([lettre, texte]) => {
      badgeLettre(ctx, 116, cy, 30, lettre, accent, false);
      ctx.fillStyle = COULEURS.craie;
      ctx.font = "500 32px Inter, system-ui, sans-serif";
      const ligneTxt = decouperTexte(ctx, texte || "", TAILLE - 260);
      ctx.textBaseline = "middle";
      ctx.fillText(ligneTxt[0] || "", 172, cy + 1);
      ctx.textBaseline = "alphabetic";
      if (lettre !== "D") {
        ctx.strokeStyle = "rgba(247,244,236,.14)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(80, cy + rowH/2); ctx.lineTo(TAILLE - 80, cy + rowH/2); ctx.stroke();
      }
      cy += rowH;
    });

    piedDePage(ctx);
    return cv;
  }

  // ---------- Slide corrigé ----------
  function slideReponses(questions, filiere) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    const accent = accentDe(filiere);
    fondCommun(ctx, accent);
    watermark(ctx, "✓", TAILLE - 260, 340, accent);

    pastille(ctx, "CORRIGÉ", 80, 70, accent, 22);
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 62px Fraunces, Georgia, serif";
    ctx.fillText("Tu as tout bon ?", 80, 220);

    const parCol = Math.ceil(questions.length / 2);
    const colW = (TAILLE - 160 - 40) / 2;
    questions.forEach((q, i) => {
      const col = i < parCol ? 0 : 1;
      const ligne = i < parCol ? i : i - parCol;
      const x = 80 + col * (colW + 40);
      const yy = 300 + ligne * 78;
      badgeLettre(ctx, x + 30, yy, 28, (q.bonne || "").toUpperCase(), accent, true);
      ctx.fillStyle = "rgba(247,244,236,.85)";
      ctx.font = "600 30px Inter, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText("Question " + (i + 1), x + 76, yy + 1);
      ctx.textBaseline = "alphabetic";
    });

    ctx.fillStyle = accent;
    rr(ctx, 80, TAILLE - 250, TAILLE - 160, 96, 20); ctx.fill();
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Refais le quiz complet sur Bientôt Étudiant", TAILLE / 2, TAILLE - 202);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    piedDePage(ctx);
    return cv;
  }

  // ---------- Post promo Facebook/WhatsApp ----------
  function slidePromo(quiz) {
    const cv = document.createElement("canvas"); cv.width = TAILLE; cv.height = TAILLE;
    const ctx = cv.getContext("2d");
    const accent = accentDe(quiz.filiere);
    fondCommun(ctx, accent);
    watermark(ctx, "!", 60, 340, accent);

    pastille(ctx, "NOUVEAU QUIZ", 80, 130, accent, 24);

    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 72px Fraunces, Georgia, serif";
    const lignes = decouperTexte(ctx, quiz.titre, TAILLE - 160);
    let y = 320;
    lignes.slice(0, 4).forEach(l => { ctx.fillText(l, 80, y); y += 82; });

    ctx.fillStyle = "rgba(247,244,236,.72)";
    ctx.font = "500 32px Inter, system-ui, sans-serif";
    ctx.fillText((FILIERES[quiz.filiere] || quiz.filiere || "") + " · " + (quiz.matiere || ""), 80, y + 30);

    const ay = TAILLE - 150;
    ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(80, ay); ctx.lineTo(220, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(200, ay - 14); ctx.lineTo(220, ay); ctx.lineTo(200, ay + 14); ctx.stroke();
    ctx.fillStyle = COULEURS.craie;
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText("Teste tes connaissances", 240, ay + 10);

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
      questions.forEach((q, i) => slidesActuelles.push(slideQuestion(q, i + 1, questions.length, quiz.filiere)));
      slidesActuelles.push(slideReponses(questions, quiz.filiere));

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

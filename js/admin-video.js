/* ============================================================
   Admin — génération d'une vidéo téléchargeable depuis n'importe
   quel quiz (publié ou non). Canvas + MediaRecorder, 100% côté
   navigateur, aucune dépendance externe. Couleur d'accent = couleur
   de la matière (voir js/matieres-data.js, couleurMatiere()).
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const statusV = (m, t) => { const el = $("vdMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const NIVEAUX = { "9e": "4e (9e Fondamentale)", ns1: "3e (NS1)", ns2: "2e (NS2)", ns3: "1ère (NS3)", ns4: "Terminale (NS4)" };

  // Matières qui ont besoin de plus de temps de réflexion (calculs)
  const MATIERES_TEMPS_LONG = ["Mathématiques", "Physique"];
  const TEMPS_DEFAUT = 5;
  const TEMPS_LONG = 12;
  const TEMPS_REVELATION = 2.2; // secondes d'affichage de la bonne réponse

  const CARTE = { ardoise: "#14342b", craie: "#f7f4ec" };
  const ACCENTS = { f1: "#2a9d6f", f2: "#4a90c4", f3: "#c96b83" };
  const ACCENT_DEFAUT = "#e8b84b";
  const VERT_BON = "#2a9d6f";

  let quiz = null, questions = [], logoImg = null, orientation = "vertical", tempsParQuestion = TEMPS_DEFAUT;

  function chargerLogo() {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { logoImg = img; resolve(); };
      img.onerror = () => resolve();
      img.src = "img/logo.png";
    });
  }

  // ---------- Bascule Pré-Fac / Secondaire (même pattern que l'onglet Carousels) ----------
  const niveauWrap = $("vdNiveauWrap");
  function sectionVd() {
    const r = document.querySelector('input[name="vdUnivers"]:checked');
    return r ? r.value : "prefac";
  }
  document.querySelectorAll('input[name="vdUnivers"]').forEach(r => r.addEventListener("change", () => {
    if (niveauWrap) niveauWrap.style.display = sectionVd() === "sec" ? "block" : "none";
    chargerListeQuiz();
  }));
  if ($("vdNiveau")) $("vdNiveau").addEventListener("change", chargerListeQuiz);
  document.querySelectorAll('.adm-tab[data-tab="video"]').forEach(t => {
    t.addEventListener("click", () => { if (typeof DB !== "undefined" && DB) chargerListeQuiz(); });
  });

  async function chargerListeQuiz() {
    const sel = $("vdQuiz");
    if (!sel || typeof DB === "undefined" || !DB) return;
    sel.innerHTML = '<option value="">Chargement…</option>';
    const estSec = sectionVd() === "sec";
    const { data } = estSec
      ? await DB.from("quiz").select("id, titre, matiere, filiere, niveau, publie").eq("niveau", $("vdNiveau").value).order("created_at", { ascending: false })
      : await DB.from("quiz").select("id, titre, matiere, filiere, niveau, publie").is("niveau", null).order("created_at", { ascending: false });
    sel.innerHTML = '<option value="">— Choisir un quiz —</option>'
      + (data || []).map(q => '<option value="' + q.id + '">' + esc(q.titre) + ' (' + esc(q.matiere) + ')' + (q.publie ? "" : " — non publié") + '</option>').join("");
    $("vdReglages").style.display = "none";
  }

  if ($("vdQuiz")) $("vdQuiz").addEventListener("change", chargerQuizChoisi);

  async function chargerQuizChoisi() {
    const quizId = $("vdQuiz").value;
    if (!quizId) { $("vdReglages").style.display = "none"; return; }
    if (typeof DB === "undefined" || !DB) { statusV("Connexion Supabase indisponible.", "err"); return; }
    statusV("Chargement du quiz…", "");
    const { data: qz, error: eQ } = await DB.from("quiz").select("*").eq("id", quizId).single();
    if (eQ || !qz) { statusV("Quiz introuvable.", "err"); return; }
    const { data: qs, error: eQs } = await DB.from("questions").select("*").eq("quiz_id", quizId).order("ordre");
    if (eQs || !qs || !qs.length) { statusV("Ce quiz n'a pas de questions.", "err"); return; }
    quiz = qz; questions = qs;
    tempsParQuestion = MATIERES_TEMPS_LONG.includes(quiz.matiere) ? TEMPS_LONG : TEMPS_DEFAUT;
    if (!logoImg) await chargerLogo();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    $("vdTemps").value = tempsParQuestion;
    const badge = $("vdTempsBadge");
    if (MATIERES_TEMPS_LONG.includes(quiz.matiere)) { badge.style.display = "inline-block"; badge.textContent = "Temps allongé — " + quiz.matiere; }
    else badge.style.display = "none";

    $("vdResultat").innerHTML = "";
    $("vdReglages").style.display = "block";
    const canvas = $("vdCanvas");
    dimensionnerCanvas(canvas, orientation);
    dessinerApercu(canvas);
    statusV(questions.length + " questions chargées.", "ok");
  }

  document.querySelectorAll('input[name="vdOrientation"]').forEach(r => r.addEventListener("change", () => {
    orientation = r.value;
    const canvas = $("vdCanvas");
    if (!canvas) return;
    dimensionnerCanvas(canvas, orientation);
    dessinerApercu(canvas);
  }));
  if ($("vdTemps")) $("vdTemps").addEventListener("change", e => {
    const v = parseInt(e.target.value, 10);
    tempsParQuestion = (v >= 2 && v <= 60) ? v : tempsParQuestion;
    e.target.value = tempsParQuestion;
    dessinerApercu($("vdCanvas"));
  });
  if ($("vdGenerer")) $("vdGenerer").addEventListener("click", lancerGeneration);

  function dimensionnerCanvas(canvas, or) {
    if (or === "vertical") { canvas.width = 1080; canvas.height = 1920; canvas.style.width = "260px"; }
    else { canvas.width = 1920; canvas.height = 1080; canvas.style.width = "440px"; }
  }

  // ---------- Dessin ----------
  function decouperTexte(ctx, texte, maxWidth) {
    const mots = (texte || "").split(/\s+/); const lignes = []; let ligne = "";
    mots.forEach(mot => {
      const essai = ligne ? ligne + " " + mot : mot;
      if (ctx.measureText(essai).width > maxWidth && ligne) { lignes.push(ligne); ligne = mot; }
      else ligne = essai;
    });
    if (ligne) lignes.push(ligne);
    return lignes;
  }
  function hexToRgba(hex, a) {
    const n = parseInt(hex.replace("#", ""), 16);
    return "rgba(" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(",") + "," + a + ")";
  }
  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }
  function accentCouleur() {
    if (typeof couleurMatiere === "function") {
      const c = couleurMatiere(quiz.matiere);
      if (c) return c;
    }
    return ACCENTS[quiz.filiere] || ACCENT_DEFAUT;
  }

  function dessinerFond(ctx, W, H) {
    ctx.fillStyle = CARTE.ardoise; ctx.fillRect(0, 0, W, H);
    const accent = accentCouleur();
    const glow = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, Math.max(W, H) * 0.7);
    glow.addColorStop(0, hexToRgba(accent, .22)); glow.addColorStop(1, hexToRgba(accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  }
  function dessinerEntete(ctx, W, H, texteKicker) {
    const accent = accentCouleur();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "700 " + Math.round(W * 0.028) + "px Inter, system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText(texteKicker.toUpperCase(), W * 0.07, H * 0.075);
  }
  function dessinerPied(ctx, W, H) {
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = "600 " + Math.round(W * 0.022) + "px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.6)";
    ctx.fillText("bientot-etudiant.vercel.app", W / 2, H * 0.965);
  }

  function dessinerIntro(ctx, W, H) {
    dessinerFond(ctx, W, H);
    const accent = accentCouleur();
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = "700 " + Math.round(W * 0.03) + "px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.65)";
    ctx.fillText(quiz.matiere.toUpperCase(), W / 2, H * 0.38);
    ctx.font = "600 " + Math.round(W * 0.062) + "px Fraunces, Georgia, serif";
    ctx.fillStyle = CARTE.craie;
    const lignes = decouperTexte(ctx, quiz.titre, W * 0.8);
    let y = H * 0.46;
    lignes.slice(0, 3).forEach(l => { ctx.fillText(l, W / 2, y); y += W * 0.075; });
    ctx.font = "600 " + Math.round(W * 0.026) + "px Inter, system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText(questions.length + " questions", W / 2, y + W * 0.03);
    if (logoImg) { const s = W * 0.11; ctx.drawImage(logoImg, W / 2 - s / 2, H * 0.14, s, s * 1.2); }
    dessinerPied(ctx, W, H);
  }

  function dessinerOutro(ctx, W, H) {
    dessinerFond(ctx, W, H);
    const accent = accentCouleur();
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    if (logoImg) { const s = W * 0.13; ctx.drawImage(logoImg, W / 2 - s / 2, H * 0.36, s, s * 1.2); }
    ctx.font = "600 " + Math.round(W * 0.05) + "px Fraunces, Georgia, serif";
    ctx.fillStyle = CARTE.craie;
    ctx.fillText("Continue de t'entraîner", W / 2, H * 0.58);
    ctx.font = "500 " + Math.round(W * 0.026) + "px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(247,244,236,.75)";
    ctx.fillText("sur Bientôt Étudiant", W / 2, H * 0.63);
    ctx.font = "700 " + Math.round(W * 0.03) + "px Inter, system-ui, sans-serif";
    ctx.fillStyle = accent;
    ctx.fillText("bientot-etudiant.vercel.app", W / 2, H * 0.72);
  }

  function dessinerQuestion(ctx, W, H, q, i, revele, secRestantes, tempsTotal) {
    dessinerFond(ctx, W, H);
    const accent = accentCouleur();
    dessinerEntete(ctx, W, H, "Question " + (i + 1) + " / " + questions.length);

    if (!revele) {
      const cx = W * 0.93, cy = H * 0.075, ray = W * 0.028;
      const frac = Math.max(0, secRestantes / tempsTotal);
      ctx.lineWidth = W * 0.009; ctx.strokeStyle = "rgba(247,244,236,.18)";
      ctx.beginPath(); ctx.arc(cx, cy, ray, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, ray, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac)); ctx.stroke();
      ctx.lineCap = "butt";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "700 " + Math.round(W * 0.026) + "px Inter, system-ui, sans-serif";
      ctx.fillStyle = CARTE.craie;
      ctx.fillText(String(Math.max(1, Math.ceil(secRestantes))), cx, cy + 1);
      ctx.textBaseline = "alphabetic";
    } else {
      ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
      ctx.font = "700 " + Math.round(W * 0.026) + "px Inter, system-ui, sans-serif";
      ctx.fillStyle = VERT_BON;
      ctx.fillText("✓ RÉPONSE", W * 0.93, H * 0.08);
    }

    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "600 " + Math.round(W * 0.04) + "px Fraunces, Georgia, serif";
    ctx.fillStyle = CARTE.craie;
    const maxW = W * 0.86;
    const lignesQ = decouperTexte(ctx, q.enonce, maxW);
    let y = H * 0.2;
    lignesQ.slice(0, 4).forEach(l => { ctx.fillText(l, W * 0.07, y); y += W * 0.05; });

    const choixY0 = Math.max(y + W * 0.06, H * 0.28);
    let hCarte = H * 0.078, gap = H * 0.035;
    const needed = 4 * hCarte + 3 * gap;
    const dispo = H * 0.92 - choixY0;
    if (needed > dispo) { const echelle = dispo / needed; hCarte *= echelle; gap *= echelle; }
    const espace = hCarte + gap;

    ["a", "b", "c", "d"].forEach((l, idx) => {
      const cy0 = choixY0 + idx * espace;
      const estBon = revele && (l === q.bonne);

      ctx.fillStyle = estBon ? hexToRgba(VERT_BON, .22) : "rgba(247,244,236,.06)";
      ctx.strokeStyle = estBon ? VERT_BON : "rgba(247,244,236,.18)";
      ctx.lineWidth = W * 0.0028;
      rr(ctx, W * 0.07, cy0, W * 0.86, hCarte, hCarte * 0.28);
      ctx.fill(); ctx.stroke();

      const lx = W * 0.07 + hCarte * 0.5, ly = cy0 + hCarte / 2;
      ctx.beginPath(); ctx.arc(lx, ly, hCarte * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = estBon ? VERT_BON : "rgba(247,244,236,.14)";
      ctx.fill();
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "700 " + Math.round(hCarte * 0.4) + "px Inter, system-ui, sans-serif";
      ctx.fillStyle = estBon ? CARTE.ardoise : CARTE.craie;
      ctx.fillText(l.toUpperCase(), lx, ly + 1);
      ctx.textBaseline = "alphabetic";

      ctx.textAlign = "left";
      ctx.font = "500 " + Math.round(hCarte * 0.32) + "px Inter, system-ui, sans-serif";
      ctx.fillStyle = CARTE.craie;
      const txtX = W * 0.07 + hCarte * 1.15, txtMaxW = W * 0.86 - hCarte * 1.3;
      const lignesC = decouperTexte(ctx, q["choix_" + l], txtMaxW);
      let ty = ly - (lignesC.length - 1) * hCarte * 0.19 + hCarte * 0.11;
      lignesC.slice(0, 2).forEach(lg => { ctx.fillText(lg, txtX, ty); ty += hCarte * 0.36; });

      if (estBon) {
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.font = "700 " + Math.round(hCarte * 0.42) + "px Inter, system-ui, sans-serif";
        ctx.fillStyle = VERT_BON;
        ctx.fillText("✓", W * 0.07 + W * 0.86 - hCarte * 0.35, ly);
        ctx.textBaseline = "alphabetic";
      }
    });

    dessinerPied(ctx, W, H);
  }

  function dessinerApercu(canvas) {
    const ctx = canvas.getContext("2d");
    if (questions.length) dessinerQuestion(ctx, canvas.width, canvas.height, questions[0], 0, false, tempsParQuestion, tempsParQuestion);
    else dessinerIntro(ctx, canvas.width, canvas.height);
  }

  // ---------- Timeline de la vidéo ----------
  function construireTimeline() {
    const segs = [];
    segs.push({ duree: 2.6, dessine: (ctx, W, H) => dessinerIntro(ctx, W, H) });
    questions.forEach((q, i) => {
      segs.push({ duree: tempsParQuestion, dessine: (ctx, W, H, t, d) => dessinerQuestion(ctx, W, H, q, i, false, d - t, d) });
      segs.push({ duree: TEMPS_REVELATION, dessine: (ctx, W, H) => dessinerQuestion(ctx, W, H, q, i, true, 0, 1) });
    });
    segs.push({ duree: 2.6, dessine: (ctx, W, H) => dessinerOutro(ctx, W, H) });
    return segs;
  }

  // ---------- Génération et enregistrement ----------
  async function lancerGeneration() {
    const btn = $("vdGenerer");
    const resultat = $("vdResultat");
    if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      resultat.innerHTML = '<div class="status-msg on err">Ce navigateur ne permet pas de générer une vidéo ici. Essaie avec une version récente de Chrome ou Firefox.</div>';
      return;
    }
    btn.disabled = true; btn.textContent = "Génération en cours…";
    resultat.innerHTML = '<div style="width:100%;height:10px;background:var(--craie-2);border-radius:20px;overflow:hidden;margin:16px 0"><div id="vdProgressBar" style="height:100%;width:0%;background:var(--ardoise);transition:width .15s linear"></div></div><p class="qz-hint" style="text-align:center">Ne ferme pas cet onglet pendant la génération.</p>';

    try {
      const canvas = $("vdCanvas");
      const ctx = canvas.getContext("2d");
      const segs = construireTimeline();
      const dureeTotale = segs.reduce((s, seg) => s + seg.duree, 0);

      const stream = canvas.captureStream(30);
      const type = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        .find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
      const rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const fini = new Promise(resolve => { rec.onstop = resolve; });

      rec.start();
      const t0 = performance.now();
      await new Promise(resolveAnim => {
        function frame(now) {
          const ecoule = (now - t0) / 1000;
          const bar = $("vdProgressBar");
          if (bar) bar.style.width = Math.min(100, Math.round(100 * ecoule / dureeTotale)) + "%";
          if (ecoule >= dureeTotale) { resolveAnim(); return; }
          let acc = 0, seg = segs[0];
          for (const s of segs) { if (ecoule < acc + s.duree) { seg = s; break; } acc += s.duree; }
          const tDansSeg = ecoule - acc;
          seg.dessine(ctx, canvas.width, canvas.height, tDansSeg, seg.duree);
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      rec.stop();
      await fini;

      const mimeFinal = rec.mimeType || type || "video/webm";
      const blob = new Blob(chunks, { type: mimeFinal });
      const url = URL.createObjectURL(blob);
      const ext = mimeFinal.indexOf("mp4") !== -1 ? "mp4" : "webm";
      const nomFichier = (quiz.titre || "quiz").toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-video." + ext;

      btn.disabled = false; btn.textContent = "Générer de nouveau";
      resultat.innerHTML =
        '<video controls src="' + url + '" style="width:100%;max-width:' + (orientation === "vertical" ? "320" : "100%") + 'px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);margin-bottom:14px;background:#000;display:block"></video>'
        + '<a class="btn btn-dark" id="vdDownload" href="' + url + '" download="' + nomFichier + '">Télécharger la vidéo <span>→</span></a>'
        + (ext === "webm" ? '<p class="qz-hint" style="margin-top:10px">Format .webm, lisible sur Android et ordinateur. Sur iPhone, une appli de conversion peut être nécessaire selon le réseau visé.</p>' : '');
      statusV("Vidéo générée.", "ok");
    } catch (err) {
      btn.disabled = false; btn.textContent = "Réessayer";
      resultat.innerHTML = '<div class="status-msg on err">La génération a échoué. Réessaie, ou utilise un autre navigateur.</div>';
    }
  }
})();

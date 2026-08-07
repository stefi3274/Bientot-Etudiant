/* ============================================================
   Admin — gestion des quiz (questions QCM 4 choix)
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français", "Botanique"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale", "Économie et Gestion"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques", "Droit"]
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const statusQ = (m, t) => { const el = $("quizMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t||"ok"); } };

  // Matières selon filière
  const selFil = $("qzFiliere"), selMat = $("qzMatiere");
  function majMat() {
    if (!selFil || !selMat) return;
    selMat.innerHTML = (MATIERES[selFil.value] || []).map(m => '<option>' + esc(m) + '</option>').join("");
    document.body.setAttribute("data-filiere", selFil.value);
    chargerLeconsRattach();
  }
  if (selFil) { selFil.addEventListener("change", majMat); majMat(); }
  if (selMat) selMat.addEventListener("change", chargerLeconsRattach);

  // Type de quiz : afficher/cacher le rattachement leçon
  const typeRadios = document.querySelectorAll('input[name="qzType"]');
  const leconWrap = $("qzLeconWrap");
  function majType() {
    const t = document.querySelector('input[name="qzType"]:checked');
    const val = t ? t.value : "lecon";
    if (leconWrap) leconWrap.style.display = (val === "lecon") ? "block" : "none";
  }
  typeRadios.forEach(r => r.addEventListener("change", majType));
  majType();

  // Charger les leçons de la matière courante pour le rattachement
  async function chargerLeconsRattach() {
    const sel = $("qzLecon");
    if (!sel || typeof DB === "undefined" || !DB) return;
    const { data } = await DB.from("lecons").select("id, titre, ordre")
      .eq("filiere", selFil.value).eq("matiere", selMat.value).order("ordre");
    const actuel = sel.value;
    sel.innerHTML = '<option value="">— Choisir une leçon —</option>'
      + (data || []).map(l => '<option value="' + l.id + '">Leçon ' + (l.ordre||1) + ' : ' + esc(l.titre) + '</option>').join("");
    if (actuel) sel.value = actuel;
  }

  // ---------- Questions dynamiques ----------
  let qCount = 0;
  const qBox = $("qzQuestions");

  function ajouterQuestion(data) {
    qCount++;
    const n = qCount;
    const d = data || {};
    const div = document.createElement("div");
    div.className = "qz-question";
    div.dataset.q = n;
    const lettre = (l, txt) =>
      '<label class="qz-choix">'
      + '<input type="radio" name="bonne-' + n + '" value="' + l + '"' + (d.bonne === l ? ' checked' : '') + '>'
      + '<span class="qz-lettre" title="Bonne réponse">' + l.toUpperCase() + '</span>'
      + '<input type="text" class="qz-txt" data-l="' + l + '" placeholder="Choix ' + l.toUpperCase() + '" value="' + esc(txt || "") + '">'
      + '</label>';
    div.innerHTML =
      '<button type="button" class="qz-del-q">Retirer</button>'
      + '<span class="qz-qnum">Question ' + n + '</span>'
      + '<textarea class="qz-enonce" placeholder="Énoncé de la question…">' + esc(d.enonce || "") + '</textarea>'
      + lettre("a", d.choix_a) + lettre("b", d.choix_b) + lettre("c", d.choix_c) + lettre("d", d.choix_d)
      + '<p class="qz-hint">Clique sur la lettre (A/B/C/D) pour marquer la bonne réponse.</p>';
    qBox.appendChild(div);
    div.querySelector(".qz-del-q").addEventListener("click", () => { div.remove(); renumeroter(); });
  }

  function renumeroter() {
    qBox.querySelectorAll(".qz-question").forEach((el, i) => {
      el.querySelector(".qz-qnum").textContent = "Question " + (i + 1);
    });
  }

  if ($("qzAddQ")) $("qzAddQ").addEventListener("click", () => ajouterQuestion());

  // ---------- Import de questions collées (texte -> QCM, sans IA) ----------
  if ($("qzVoirFormat")) $("qzVoirFormat").addEventListener("click", e => {
    e.preventDefault();
    const ex = $("qzExempleFormat");
    ex.style.display = ex.style.display === "none" ? "block" : "none";
  });

  function parseQuestionsTexte(txt) {
    const blocs = txt.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const questions = [];
    blocs.forEach(bloc => {
      const lignes = bloc.split("\n").map(l => l.trim()).filter(Boolean);
      if (!lignes.length) return;
      const enonce = lignes[0].replace(/^\d+[.)]\s*/, "");
      const choix = {};
      let bonne = null;
      lignes.slice(1).forEach(l => {
        const m = l.match(/^([A-Da-d])[).]\s*(.+)$/);
        if (m) choix["choix_" + m[1].toLowerCase()] = m[2].trim();
        const r = l.match(/^R[ée]ponse\s*:\s*([A-Da-d])/i);
        if (r) bonne = r[1].toLowerCase();
      });
      questions.push({ enonce, choix_a: choix.choix_a || "", choix_b: choix.choix_b || "", choix_c: choix.choix_c || "", choix_d: choix.choix_d || "", bonne: bonne || "a" });
    });
    return questions;
  }

  // Découpe sur des marqueurs ===QUIZ: Sous-titre=== pour détecter plusieurs quiz d'un coup.
  // Le texte éventuel AVANT le premier marqueur (titre, intro) est ignoré.
  // Compatible aussi avec l'ancien style ===QUIZ 1/5=== (numérotation auto en repli).
  function detecterGroupes(txt) {
    const regexMarqueur = /^\s*===\s*QUIZ\s*:?\s*([^\n=]*?)\s*===\s*$/gim;
    const matches = [...txt.matchAll(regexMarqueur)];
    if (!matches.length) return [{ sousTitre: "", texte: txt.trim() }];

    const groupes = [];
    for (let i = 0; i < matches.length; i++) {
      const debut = matches[i].index + matches[i][0].length;
      const fin = (i + 1 < matches.length) ? matches[i + 1].index : txt.length;
      const morceau = txt.slice(debut, fin).trim();
      if (!morceau) continue;
      let sousTitre = matches[i][1].trim();
      const mNum = sousTitre.match(/^(\d+)\s*\/\s*\d+$/) || sousTitre.match(/^(\d+)$/);
      if (mNum) sousTitre = "Partie " + mNum[1];
      if (!sousTitre) sousTitre = "Partie " + (groupes.length + 1);
      groupes.push({ sousTitre, texte: morceau });
    }
    return groupes;
  }

  if ($("qzImporterTexte")) $("qzImporterTexte").addEventListener("click", async () => {
    const txt = ($("qzTexteImport").value || "").trim();
    if (!txt) { statusQ("Colle d'abord tes questions.", "err"); return; }

    const groupes = detecterGroupes(txt);

    // Un seul groupe (ou pas de marqueur) : comportement existant, remplit le formulaire pour relecture
    if (groupes.length <= 1) {
      const questions = parseQuestionsTexte(groupes.length ? groupes[0].texte : txt);
      if (!questions.length) { statusQ("Aucune question reconnue dans le texte collé.", "err"); return; }
      const incomplete = questions.findIndex(q => !q.enonce || !q.choix_a || !q.choix_b || !q.choix_c || !q.choix_d);
      if (incomplete !== -1) { statusQ("Question " + (incomplete + 1) + " incomplète (énoncé + 4 choix requis, format \"A) ...\").", "err"); return; }
      qBox.innerHTML = ""; qCount = 0;
      questions.forEach(q => ajouterQuestion(q));
      statusQ(questions.length + " question(s) importée(s). Vérifie, puis publie le quiz.", "ok");
      $("qzTexteImport").value = "";
      return;
    }

    // Plusieurs groupes ===QUIZ:...=== détectés : publication directe de N quiz séparés (type "dimanche", sans leçon)
    const titreBase = ($("qzTitre").value || "").trim();
    if (!titreBase) { statusQ(groupes.length + " groupes détectés. Renseigne d'abord le grand titre (ex: \"Biologie Cellulaire\") avant d'importer.", "err"); return; }
    if (typeof DB === "undefined" || !DB) { statusQ("Connexion Supabase indisponible.", "err"); return; }
    const apercuTitres = groupes.map(g => titreBase + " — " + g.sousTitre).join("\n");
    if (!confirm(groupes.length + " quiz détectés, publiés sous :\n" + apercuTitres + "\n\nConfirmer ?")) return;

    statusQ("Publication de " + groupes.length + " quiz…", "");
    const ent = await monEnt();
    if (!ent) { statusQ("Entreprise introuvable.", "err"); return; }
    const dureeSec = (parseInt($("qzDuree").value) || 10) * 60;
    const typeChoisi = (document.querySelector('input[name="qzType"]:checked') || {}).value;
    const typeLot = typeChoisi === "gogo" ? "gogo" : "dimanche";

    let ok = 0, erreurs = [];
    for (let i = 0; i < groupes.length; i++) {
      const questions = parseQuestionsTexte(groupes[i].texte);
      if (!questions.length) { erreurs.push(groupes[i].sousTitre + " : aucune question reconnue."); continue; }
      const incomplete = questions.findIndex(q => !q.enonce || !q.choix_a || !q.choix_b || !q.choix_c || !q.choix_d);
      if (incomplete !== -1) { erreurs.push(groupes[i].sousTitre + ", question " + (incomplete + 1) + " incomplète."); continue; }

      const { data: qz, error: eQz } = await DB.from("quiz").insert({
        entreprise_id: ent, filiere: selFil.value, matiere: selMat.value,
        titre: titreBase + " — " + groupes[i].sousTitre, duree_sec: dureeSec,
        type: typeLot, lecon_id: null, publie: true
      }).select("id").single();
      if (eQz) { erreurs.push(groupes[i].sousTitre + " : " + eQz.message); continue; }

      const rows = questions.map((q, idx) => ({
        quiz_id: qz.id, ordre: idx + 1, enonce: q.enonce,
        choix_a: q.choix_a, choix_b: q.choix_b, choix_c: q.choix_c, choix_d: q.choix_d, bonne: q.bonne
      }));
      const { error: eQ } = await DB.from("questions").insert(rows);
      if (eQ) { erreurs.push(groupes[i].sousTitre + " (questions) : " + eQ.message); continue; }
      ok++;
    }

    if (erreurs.length) statusQ(ok + " quiz publiés, " + erreurs.length + " erreur(s) : " + erreurs.join(" | "), "err");
    else statusQ(ok + " quiz publiés avec succès sous \"" + titreBase + " — ...\" !", "ok");
    $("qzTexteImport").value = "";
    chargerQuiz();
  });

  // Fonction exposée globalement (non utilisée actuellement, gardée si besoin futur de préremplissage)
  window.BQ_remplirQuestions = function (questions) {
    qBox.innerHTML = ""; qCount = 0;
    (questions || []).forEach(q => ajouterQuestion(q));
    if (!questions || !questions.length) ajouterQuestion();
  };

  // ---------- Onglet quiz : init au premier affichage ----------
  let initFait = false;
  document.querySelectorAll('.adm-tab[data-tab="quiz"]').forEach(t => {
    t.addEventListener("click", () => {
      if (!initFait) { ajouterQuestion(); initFait = true; }
      if (typeof DB !== "undefined" && DB) setTimeout(chargerQuiz, 50);
    });
  });

  if (typeof DB === "undefined" || !DB) return;

  async function monEnt() {
    const { data: prof } = await DB.from("profils").select("entreprise_id").maybeSingle();
    return prof ? prof.entreprise_id : null;
  }

  // ---------- Lire les questions du formulaire ----------
  function lireQuestions() {
    const out = [];
    qBox.querySelectorAll(".qz-question").forEach((el, i) => {
      const enonce = el.querySelector(".qz-enonce").value.trim();
      const txt = {};
      el.querySelectorAll(".qz-txt").forEach(t => txt[t.dataset.l] = t.value.trim());
      const bonneEl = el.querySelector('input[type=radio]:checked');
      const bonne = bonneEl ? bonneEl.value : null;
      out.push({ ordre: i + 1, enonce, choix_a: txt.a, choix_b: txt.b, choix_c: txt.c, choix_d: txt.d, bonne });
    });
    return out;
  }

  // ---------- Enregistrer ----------
  let editId = null;

  if ($("qzSave")) $("qzSave").addEventListener("click", async () => {
    const titre = $("qzTitre").value.trim();
    if (!titre) { statusQ("Le titre est requis.", "err"); return; }
    const questions = lireQuestions();
    if (questions.length === 0) { statusQ("Ajoute au moins une question.", "err"); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.enonce || !q.choix_a || !q.choix_b || !q.choix_c || !q.choix_d) {
        statusQ("Question " + (i+1) + " : remplis l'énoncé et les 4 choix.", "err"); return;
      }
      if (!q.bonne) { statusQ("Question " + (i+1) + " : indique la bonne réponse.", "err"); return; }
    }

    statusQ("Enregistrement…", "");
    const ent = await monEnt();
    if (!ent) { statusQ("Entreprise introuvable.", "err"); return; }

    const typeQ = (document.querySelector('input[name="qzType"]:checked') || {}).value || "lecon";
    const leconId = ($("qzLecon") && $("qzLecon").value) ? $("qzLecon").value : null;
    if (typeQ === "lecon" && !leconId) { statusQ("Choisis la leçon à rattacher (ou passe en Quiz Libre).", "err"); return; }

    const quizData = {
      entreprise_id: ent,
      filiere: selFil.value,
      matiere: selMat.value,
      titre: titre,
      duree_sec: (parseInt($("qzDuree").value) || 10) * 60,
      type: typeQ,
      lecon_id: (typeQ === "lecon") ? leconId : null,
      publie: true
    };

    let quizId = editId;
    if (editId) {
      const { error } = await DB.from("quiz").update(quizData).eq("id", editId);
      if (error) { statusQ("Erreur : " + error.message, "err"); return; }
      await DB.from("questions").delete().eq("quiz_id", editId); // on remplace les questions
    } else {
      const { data, error } = await DB.from("quiz").insert(quizData).select("id").single();
      if (error) { statusQ("Erreur : " + error.message, "err"); return; }
      quizId = data.id;
    }

    // insérer les questions
    const rows = questions.map(q => ({ quiz_id: quizId, ordre: q.ordre, enonce: q.enonce,
      choix_a: q.choix_a, choix_b: q.choix_b, choix_c: q.choix_c, choix_d: q.choix_d, bonne: q.bonne }));
    const { error: qErr } = await DB.from("questions").insert(rows);
    if (qErr) { statusQ("Quiz créé mais erreur questions : " + qErr.message, "err"); return; }

    statusQ(editId ? "Quiz modifié !" : "Quiz publié !", "ok");
    resetQuiz();
    chargerQuiz();
  });

  if ($("qzCancel")) $("qzCancel").addEventListener("click", resetQuiz);

  function resetQuiz() {
    editId = null;
    $("qzTitre").value = ""; $("qzDuree").value = "10";
    const rLecon = document.querySelector('input[name="qzType"][value="lecon"]');
    if (rLecon) rLecon.checked = true;
    majType();
    if ($("qzLecon")) $("qzLecon").value = "";
    qBox.innerHTML = ""; qCount = 0;
    ajouterQuestion();
    $("quizFormTitre").textContent = "Nouveau quiz";
    $("qzSave").innerHTML = 'Publier le quiz <span>→</span>';
    $("qzCancel").style.display = "none";
  }

  // ---------- Liste des quiz ----------
  async function chargerQuiz() {
    const box = $("quizList");
    if (!box) return;
    box.innerHTML = "<p class='empty'>Chargement…</p>";
    const { data, error } = await DB.from("quiz").select("*, questions(count)").order("created_at", { ascending: false });
    if (error) { box.innerHTML = "<p class='empty'>Erreur de chargement.</p>"; return; }
    if (!data.length) { box.innerHTML = "<p class='empty'>Aucun quiz pour l'instant.</p>"; return; }

    box.innerHTML = data.map(q => {
      const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
      const estDim = q.type === "dimanche";
      return '<div class="quiz-item ' + q.filiere + '">'
        + '<div class="qi-info"><b>' + esc(q.titre) + (estDim ? ' <span class="badge-libre">Libre</span>' : '') + '</b>'
        + '<span class="qi-meta">' + esc(q.matiere) + ' · ' + nbQ + ' questions · ' + Math.round(q.duree_sec/60) + ' min</span></div>'
        + '<div class="lec-act">'
        + '<button data-edit="' + q.id + '">Modifier</button>'
        + '<button class="del" data-del="' + q.id + '">Supprimer</button>'
        + '</div></div>';
    }).join("");

    box.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editQuiz(b.getAttribute("data-edit")));
    box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => delQuiz(b.getAttribute("data-del")));
  }

  async function editQuiz(id) {
    const { data: q } = await DB.from("quiz").select("*").eq("id", id).single();
    const { data: qs } = await DB.from("questions").select("*").eq("quiz_id", id).order("ordre");
    if (!q) return;
    editId = id;
    selFil.value = q.filiere; majMat(); selMat.value = q.matiere;
    // type + leçon rattachée
    const typeRadio = document.querySelector('input[name="qzType"][value="' + (q.type || "lecon") + '"]');
    if (typeRadio) typeRadio.checked = true;
    majType();
    await chargerLeconsRattach();
    if (q.lecon_id && $("qzLecon")) $("qzLecon").value = q.lecon_id;
    $("qzTitre").value = q.titre;
    $("qzDuree").value = Math.round(q.duree_sec / 60);
    qBox.innerHTML = ""; qCount = 0;
    (qs || []).forEach(question => ajouterQuestion(question));
    if (!qs || !qs.length) ajouterQuestion();
    $("quizFormTitre").textContent = "Modifier le quiz";
    $("qzSave").innerHTML = 'Enregistrer <span>→</span>';
    $("qzCancel").style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function delQuiz(id) {
    if (!confirm("Supprimer ce quiz et toutes ses questions ?")) return;
    await DB.from("quiz").delete().eq("id", id); // cascade supprime questions
    if (editId === id) resetQuiz();
    chargerQuiz();
  }

  // ---------- Déplacer des quiz en lot (correction d'erreur de filière) ----------
  const depSelFil = $("depFiliereSource"), depSelMat = $("depMatiere");
  const statusDep = (m, t) => { const el = $("depMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };
  function majDepMat() {
    if (!depSelFil || !depSelMat) return;
    depSelMat.innerHTML = '<option value="">Toutes les matières</option>'
      + (MATIERES[depSelFil.value] || []).map(m => '<option>' + esc(m) + '</option>').join("");
  }
  if (depSelFil) { depSelFil.addEventListener("change", majDepMat); majDepMat(); }

  if ($("depDeplacerBtn")) $("depDeplacerBtn").addEventListener("click", async () => {
    const source = $("depFiliereSource"), dest = $("depFiliereDest");
    const matiere = $("depMatiere").value, type = $("depType").value;
    if (source.value === dest.value) { statusDep("La filière de destination doit être différente de l'actuelle.", "err"); return; }

    const libSource = source.options[source.selectedIndex].text;
    const libDest = dest.options[dest.selectedIndex].text;
    const quoi = (matiere || "toutes les matières") + (type ? " (" + $("depType").options[$("depType").selectedIndex].text + ")" : "");
    if (!confirm('Déplacer "' + quoi + '" de "' + libSource + '" vers "' + libDest + '" ?\n\nSi une leçon est rattachée à certains de ces quiz, elle ne sera PAS déplacée avec eux — préfère cet outil pour les Quiz Libres et Quiz à Gogo.')) return;

    statusDep("Déplacement en cours…", "");
    let q = DB.from("quiz").update({ filiere: dest.value }).eq("filiere", source.value);
    if (matiere) q = q.eq("matiere", matiere);
    if (type) q = q.eq("type", type);
    const { data, error } = await q.select("id");
    if (error) { statusDep("Erreur : " + error.message, "err"); return; }
    statusDep((data || []).length + " quiz déplacé(s) vers " + libDest + ".", "ok");
    chargerQuiz();
  });
})();

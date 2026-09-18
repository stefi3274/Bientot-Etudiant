/* ============================================================
   Admin — Fiche : colle une leçon + un quiz déjà rédigés,
   tout est importé et publié automatiquement (aucune IA,
   aucun coût — simple parsing de texte).
   Format : TITRE: / APERCU: / --- / contenu / ===QUIZ=== / questions
   Plusieurs leçons d'un coup : séparer par une ligne %%%LECON%%%
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français", "Botanique"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale", "Économie et Gestion"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques", "Droit"]
  };
  const MATIERES_9E_AF = ["Mathématiques", "Français", "Créole", "Anglais", "Espagnol",
      "Sciences Sociales", "Sciences Expérimentales", "Éducation à la Citoyenneté"];
    // Tronc commun NS1/NS2 (S1-S2 du Nouveau Secondaire) — programme MENFP 2024
    const TRONC_COMMUN = ["Mathématiques", "Français", "Créole", "Anglais", "Espagnol",
      "Histoire-Géographie", "Physique", "Chimie", "Biologie", "Économie",
      "Éducation à la Citoyenneté", "Informatique"];
  const DOMAINES_MATH_9E_AF = ["Algèbre", "Géométrie", "Mesures", "Applications"];
  const DOMAINES_MATH_SECONDAIRE = ["Nombres et calculs", "Calcul algébrique", "Fonctions", "Géométrie",
    "Probabilités", "Statistique", "Algorithmique et programmation", "Logique et raisonnement", "Matrices et graphes"];
  const SERIES_MATIERES = {
    svt: ["Mathématiques", "Physique", "Chimie", "Biologie/Géologie", "Histoire-Géographie", "Philosophie", "Économie", "Informatique", "Anglais", "Espagnol"],
    mp: ["Mathématiques", "Physique", "Chimie", "Histoire-Géographie", "Philosophie", "Économie", "Informatique", "Anglais", "Espagnol"],
    ses: ["Mathématiques", "Économie", "Physique", "Biologie/Géologie", "Histoire-Géographie", "Philosophie", "Informatique", "Anglais", "Espagnol"],
    lla: ["Français", "Anglais", "Espagnol", "Arts", "Mathématiques", "Physique", "Histoire-Géographie", "Philosophie", "Économie"]
  };
  const NIVEAUX_AVEC_SERIE = ["ns3", "ns4"];
  const esc = s => (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const statusFi = (m, t) => { const el = $("fiMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  const selFil = $("fiFiliere"), selMat = $("fiMatiere");
  function majMat() {
    if (!selFil || !selMat) return;
    selMat.innerHTML = (MATIERES[selFil.value] || []).map(m => "<option>" + m + "</option>").join("");
  }
  if (selFil) { selFil.addEventListener("change", majMat); majMat(); }

  // ---------- Secondaire : niveau -> (série si NS3/NS4) -> matières fixes ----------
  const fiFiliereWrap = $("fiFiliereWrap"), fiNiveauWrap = $("fiNiveauWrap");
  const fiSelNiveau = $("fiNiveau"), fiSerieWrap = $("fiSerieWrap"), fiSelSerie = $("fiSerie"), fiSelMatSec = $("fiMatiereSec");

  function sectionActuelle() { return window.adminUnivers || "univ"; }

  function majMatieresSecondaire() {
    if (!fiSelNiveau || !fiSelMatSec) return;
    const avecSerie = NIVEAUX_AVEC_SERIE.includes(fiSelNiveau.value);
    if (fiSerieWrap) fiSerieWrap.style.display = avecSerie ? "block" : "none";
    const opts = avecSerie ? (SERIES_MATIERES[fiSelSerie.value] || []) : (fiSelNiveau.value === "9e" ? MATIERES_9E_AF : TRONC_COMMUN);
    fiSelMatSec.innerHTML = opts.map(m => '<option>' + esc(m) + '</option>').join("");
    majDomaine();
  }
  if (fiSelNiveau) fiSelNiveau.addEventListener("change", majMatieresSecondaire);
  if (fiSelSerie) fiSelSerie.addEventListener("change", majMatieresSecondaire);

  const fiDomaineWrap = $("fiDomaineWrap"), fiSelDomaine = $("fiDomaine");
  function majDomaine() {
    if (!fiSelDomaine || !fiDomaineWrap) return;
    if (fiSelMatSec.value !== "Mathématiques") { fiDomaineWrap.style.display = "none"; fiSelDomaine.innerHTML = ""; return; }
    fiDomaineWrap.style.display = "block";
    const liste = fiSelNiveau.value === "9e" ? DOMAINES_MATH_9E_AF : DOMAINES_MATH_SECONDAIRE;
    fiSelDomaine.innerHTML = liste.map(d => '<option>' + esc(d) + '</option>').join("");
  }
  if (fiSelMatSec) fiSelMatSec.addEventListener("change", majDomaine);

  function majSection() {
    const sec = sectionActuelle() === "sec";
    if (fiFiliereWrap) fiFiliereWrap.style.display = sec ? "none" : "flex";
    if (fiNiveauWrap) fiNiveauWrap.style.display = sec ? "flex" : "none";
    if (sec) majMatieresSecondaire();
  }
  document.addEventListener("univers-change", majSection);
  majMatieresSecondaire();

  if ($("fiVoirFormat")) $("fiVoirFormat").addEventListener("click", e => {
    e.preventDefault();
    const ex = $("fiExempleFormat");
    ex.style.display = ex.style.display === "none" ? "block" : "none";
  });

  // ---------- Parsing du texte structuré ----------
  function escHtml(s) { return (s || "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c])); }

  // Échappe le texte tout en mettant en valeur guillemets/parenthèses (couleur + gras)
  function embellirTexte(txt) {
    const regex = /("[^"\n]+"|«[^»\n]+»|\([^)\n]+\))/g;
    let resultat = "", dernier = 0, m;
    while ((m = regex.exec(txt)) !== null) {
      resultat += escHtml(txt.slice(dernier, m.index));
      resultat += '<strong class="fiche-accent">' + escHtml(m[0]) + '</strong>';
      dernier = m.index + m[0].length;
    }
    resultat += escHtml(txt.slice(dernier));
    return resultat;
  }

  function texteVersHtmlSimple(txt) {
    const paragraphes = txt.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return paragraphes.map(p => {
      const lignes = p.split("\n").map(l => l.trim()).filter(Boolean);
      if (lignes.length && lignes.every(l => /^[-*]\s+/.test(l))) {
        return "<ul>" + lignes.map(l => "<li>" + embellirTexte(l.replace(/^[-*]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      const estExemple = /^(exemple|ex\s*[:.])/i.test(p);
      const contenu = embellirTexte(p).replace(/\n/g, "<br>");
      return estExemple ? '<p class="fiche-exemple">' + contenu + '</p>' : "<p>" + contenu + "</p>";
    }).join("\n");
  }

  // Construit une carte "fiche" (couverture, contenu, ou fin) — un seul format partout.
  function carteFiche(classeExtra, numero, total, titre, htmlInterieur) {
    return '<div class="fiche' + (classeExtra ? " " + classeExtra : "") + '">'
      + '<span class="fiche-num">' + numero + ' / ' + total + '</span>'
      + '<h3>' + escHtml(titre) + '</h3>'
      + htmlInterieur
      + '</div>';
  }

  // Convertit le contenu en fiches (cartes) — couverture + fiches + fin construites
  // ensemble en une seule passe (pas de recherche/remplacement fragile après coup).
  function contenuVersFiches(txt, titreLecon, apercuLecon) {
    const regexFiches = /^\s*===\s*FICHE\s*:?\s*([^\n=]*?)\s*===\s*$/gim;
    const matches = [...txt.matchAll(regexFiches)];
    if (!matches.length) {
      // Pas de marqueur ===FICHE:...=== : on garde l'ancien rendu simple (rétrocompatible)
      return { html: texteVersHtmlSimple(txt), nbFiches: 0 };
    }
    const fiches = [];
    for (let i = 0; i < matches.length; i++) {
      const debut = matches[i].index + matches[i][0].length;
      const fin = (i + 1 < matches.length) ? matches[i + 1].index : txt.length;
      const contenuBrut = txt.slice(debut, fin).trim();
      if (!contenuBrut) continue;
      fiches.push({ titre: matches[i][1].trim() || ("Fiche " + (fiches.length + 1)), contenu: contenuBrut });
    }
    if (!fiches.length) return { html: texteVersHtmlSimple(txt), nbFiches: 0 };

    const total = fiches.length + 2;
    const cartes = [
      carteFiche("fiche-couverture", 1, total, titreLecon, apercuLecon ? "<p>" + escHtml(apercuLecon) + "</p>" : ""),
      ...fiches.map((f, i) => carteFiche("", i + 2, total, f.titre, texteVersHtmlSimple(f.contenu))),
      carteFiche("fiche-fin", total, total, "Rejoins la communauté !",
        "<p>Crée un compte gratuit pour suivre ta progression et garder ta série de révision.</p>"
        + "<p>Et maintenant... à toi de jouer : fais le quiz de cette leçon pour vérifier ce que tu as retenu 👇</p>")
    ].join("\n");

    return {
      html: '<p class="fiches-hint">👉 Fais glisser pour voir toutes les fiches</p><div class="fiches-carousel">' + cartes + '</div>',
      nbFiches: fiches.length
    };
  }

  function parseQuestions(txt) {
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
      questions.push({
        enonce, choix_a: choix.choix_a || "", choix_b: choix.choix_b || "",
        choix_c: choix.choix_c || "", choix_d: choix.choix_d || "", bonne: bonne || "a"
      });
    });
    return questions;
  }

  // Détecte un ou plusieurs marqueurs ===QUIZ...=== (===QUIZ===, ===QUIZ 1===, ===QUIZ: Titre===...)
  // et découpe le texte en autant de groupes de questions.
  function detecterGroupesQuiz(texteApres) {
    const regex = /^\s*===\s*QUIZ\s*:?\s*([^\n=]*?)\s*===\s*$/gim;
    const matches = [...texteApres.matchAll(regex)];
    if (!matches.length) return [{ sousTitre: "", texte: texteApres.trim() }];
    const groupes = [];
    for (let i = 0; i < matches.length; i++) {
      const debut = matches[i].index + matches[i][0].length;
      const fin = (i + 1 < matches.length) ? matches[i + 1].index : texteApres.length;
      const morceau = texteApres.slice(debut, fin).trim();
      if (!morceau) continue;
      let sousTitre = matches[i][1].trim();
      if (/^\d+$/.test(sousTitre)) sousTitre = "Quiz " + sousTitre;
      if (!sousTitre) sousTitre = "Quiz " + (groupes.length + 1);
      groupes.push({ sousTitre, texte: morceau });
    }
    return groupes;
  }

  function parseUneLecon(bloc) {
    const idxQuiz = bloc.search(/^\s*===\s*QUIZ[^\n=]*===\s*$/im);
    if (idxQuiz < 0) throw new Error("Marqueur ===QUIZ=== manquant.");
    const avant = bloc.slice(0, idxQuiz);
    const apres = bloc.slice(idxQuiz);

    const titreMatch = avant.match(/^TITRE\s*:\s*(.+)$/im);
    const chapitreMatch = avant.match(/^CHAPITRE\s*:\s*(.+)$/im);
    const apercuMatch = avant.match(/^APERCU\s*:\s*(.+)$/im);
    if (!titreMatch) throw new Error("Ligne TITRE: manquante.");

    let contenuBrut = avant;
    const idxSep = avant.search(/^---$/m);
    if (idxSep >= 0) contenuBrut = avant.slice(idxSep + 3);
    else contenuBrut = avant.replace(/^TITRE\s*:.*$/im, "").replace(/^CHAPITRE\s*:.*$/im, "").replace(/^APERCU\s*:.*$/im, "");

    const titre = titreMatch[1].trim();
    const chapitre = chapitreMatch ? chapitreMatch[1].trim() : "";
    const groupesQuiz = detecterGroupesQuiz(apres);
    const quizzes = groupesQuiz.map(g => {
      const questions = parseQuestions(g.texte);
      if (!questions.length) throw new Error('Aucune question trouvée pour "' + g.sousTitre + '" de la leçon "' + titre + '".');
      questions.forEach((q, i) => {
        if (!q.choix_a || !q.choix_b || !q.choix_c || !q.choix_d) {
          throw new Error("Question " + (i + 1) + ' de "' + g.sousTitre + '" (' + titre + ') : il manque un choix A/B/C/D (format "A) ...").');
        }
      });
      return { sousTitre: g.sousTitre, questions };
    });

    const apercu = apercuMatch ? apercuMatch[1].trim() : "";
    const fiches = contenuVersFiches(contenuBrut.trim(), titre, apercu);

    return {
      titre,
      chapitre,
      apercu,
      contenu_html: fiches.html,
      quizzes
    };
  }

  function parseTexteStructure(texteBrut) {
    const blocs = texteBrut.split(/^%%%LECON%%%$/im).map(b => b.trim()).filter(Boolean);
    if (!blocs.length) throw new Error("Texte vide.");
    return blocs.map(parseUneLecon);
  }

  // ---------- Publication directe ----------
  async function monEnt() {
    const { data: prof } = await DB.from("profils").select("entreprise_id").maybeSingle();
    return prof ? prof.entreprise_id : null;
  }

  if ($("fiPublier")) $("fiPublier").addEventListener("click", async () => {
    const txt = ($("fiTexte").value || "").trim();
    if (!txt) { statusFi("Colle d'abord ta leçon + ton quiz.", "err"); return; }

    let lecons;
    try {
      lecons = parseTexteStructure(txt);
    } catch (e) {
      statusFi("Erreur de format : " + e.message, "err");
      return;
    }

    if (typeof DB === "undefined" || !DB) { statusFi("Connexion Supabase indisponible.", "err"); return; }

    $("fiPublier").disabled = true;
    statusFi("Publication en cours…", "");

    const estSecFi = sectionActuelle() === "sec";
    const niveau = estSecFi ? fiSelNiveau.value : null;
    const avecSerieFi = estSecFi && NIVEAUX_AVEC_SERIE.includes(niveau);
    const filiere = estSecFi ? (avecSerieFi ? fiSelSerie.value : null) : selFil.value;
    const matiere = estSecFi ? fiSelMatSec.value : selMat.value;
    if (estSecFi && !matiere) { statusFi("La matière est requise.", "err"); $("fiPublier").disabled = false; return; }
    const domaine = (estSecFi && matiere === "Mathématiques" && fiSelDomaine.value) ? fiSelDomaine.value : null;
    const ent = await monEnt();
    if (!ent) { statusFi("Connexion perdue (ta session a peut-être expiré). Recharge la page et reconnecte-toi, puis réessaie.", "err"); $("fiPublier").disabled = false; return; }

    let ordreQ = DB.from("lecons").select("ordre").eq("matiere", matiere);
    ordreQ = estSecFi ? ordreQ.eq("niveau", niveau) : ordreQ.eq("filiere", filiere);
    const { data: ordresExistants, error: eOrdre } = await ordreQ;
    if (eOrdre) { statusFi("Erreur lors du calcul de l'ordre : " + eOrdre.message, "err"); $("fiPublier").disabled = false; return; }
    let ordre = ordresExistants && ordresExistants.length
      ? Math.max(...ordresExistants.map(o => o.ordre || 0)) + 1
      : 1;

    let ok = 0, erreurs = [], resume = [];
    for (const d of lecons) {
      try {
        const { data: lec, error: eLec } = await DB.from("lecons").insert({
          entreprise_id: ent, filiere, niveau, matiere, domaine, titre: d.titre, chapitre: d.chapitre || null, apercu: d.apercu || null,
          contenu: d.contenu_html, publie: true, ordre: ordre
        }).select("id").single();
        if (eLec) throw new Error(eLec.message);
        ordre++;

        let totalQuestions = 0;
        for (const qz of d.quizzes) {
          const titreQuiz = d.quizzes.length > 1 ? qz.sousTitre + " — " + d.titre : "Quiz — " + d.titre;
          const { data: qzRow, error: eQz } = await DB.from("quiz").insert({
            entreprise_id: ent, filiere, niveau, matiere, domaine, titre: titreQuiz,
            duree_sec: 600, type: "lecon", lecon_id: lec.id, publie: true
          }).select("id").single();
          if (eQz) throw new Error(eQz.message);

          const rows = qz.questions.map((q, i) => ({
            quiz_id: qzRow.id, ordre: i + 1, enonce: q.enonce,
            choix_a: q.choix_a, choix_b: q.choix_b, choix_c: q.choix_c, choix_d: q.choix_d, bonne: q.bonne
          }));
          const { error: eQ } = await DB.from("questions").insert(rows);
          if (eQ) throw new Error(eQ.message);
          totalQuestions += qz.questions.length;
        }

        ok++;
        resume.push("<li><b>" + esc(d.titre) + "</b> — " + d.quizzes.length + " quiz, " + totalQuestions + " questions</li>");
      } catch (e) {
        erreurs.push(d.titre + " : " + e.message);
      }
    }

    $("fiPublier").disabled = false;
    $("fiApercuListe").innerHTML = "<ul>" + resume.join("") + "</ul>";
    $("fiApercuZone").style.display = resume.length ? "block" : "none";

    if (erreurs.length) statusFi(ok + " publiée(s), " + erreurs.length + " erreur(s) : " + erreurs.join(" | "), "err");
    else { statusFi(ok + " leçon(s) + quiz publiés avec succès !", "ok"); $("fiTexte").value = ""; }
  });

  // ============================================================
  // MODIFIER UNE LEÇON EXISTANTE (+ tous ses quiz, sur un seul écran)
  // ============================================================
  const gererMsg = (m, t) => { const el = $("gererMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };
  const gererListeEl = $("gererListe"), gererZone = $("gererZone"), gererRecherche = $("gererRecherche");
  let gererResultats = [];

  async function chargerListeLeconsGerer() {
    if (!gererListeEl || typeof DB === "undefined" || !DB) return;
    const estSec = sectionActuelle() === "sec";
    let q = DB.from("lecons").select("id, titre, matiere, niveau, filiere").order("created_at", { ascending: false });
    if (estSec) {
      if (fiSelNiveau && fiSelNiveau.value) q = q.eq("niveau", fiSelNiveau.value);
    } else {
      if (selFil && selFil.value) q = q.eq("filiere", selFil.value);
    }
    const { data, error } = await q;
    if (error) { gererListeEl.innerHTML = "<p class='empty' style='padding:10px'>Erreur de chargement.</p>"; return; }
    gererResultats = data || [];
    afficherListeGerer();
  }

  function afficherListeGerer() {
    const filtre = (gererRecherche.value || "").trim().toLowerCase();
    const liste = filtre
      ? gererResultats.filter(l => l.titre.toLowerCase().includes(filtre))
      : gererResultats;
    if (!liste.length) {
      gererListeEl.innerHTML = "<p class='empty' style='padding:10px;margin:0'>Aucune leçon trouvée.</p>";
      return;
    }
    gererListeEl.innerHTML = liste.slice(0, 30).map(l =>
      '<div class="gerer-item" data-id="' + l.id + '" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--craie-2)">'
      + '<b>' + esc(l.titre) + '</b> <span style="color:var(--encre-2);font-size:.85rem">· ' + esc(l.matiere) + '</span>'
      + '</div>'
    ).join("");
    gererListeEl.querySelectorAll(".gerer-item").forEach(el => {
      el.addEventListener("click", () => selectionnerLeconGerer(el.dataset.id));
      el.addEventListener("mouseenter", () => el.style.background = "var(--craie-2)");
      el.addEventListener("mouseleave", () => el.style.background = "");
    });
  }

  if (gererRecherche) gererRecherche.addEventListener("input", afficherListeGerer);
  document.addEventListener("univers-change", () => { if (gererListeEl) chargerListeLeconsGerer(); });
  if (selFil) selFil.addEventListener("change", chargerListeLeconsGerer);
  if (selMat) selMat.addEventListener("change", chargerListeLeconsGerer);
  if (fiSelNiveau) fiSelNiveau.addEventListener("change", chargerListeLeconsGerer);
  document.querySelectorAll('#admSubTabs .adm-tab[data-tab="fiche"]').forEach(t => {
    t.addEventListener("click", () => { if (typeof DB !== "undefined" && DB) chargerListeLeconsGerer(); });
  });

  async function selectionnerLeconGerer(leconId) {
    gererMsg("Chargement…", "");
    const { data: lecon, error: eL } = await DB.from("lecons").select("*").eq("id", leconId).single();
    if (eL || !lecon) { gererMsg("Impossible de charger cette leçon.", "err"); return; }
    const { data: quizzes, error: eQ } = await DB.from("quiz").select("id, titre").eq("lecon_id", leconId).order("created_at");
    if (eQ) { gererMsg("Erreur au chargement des quiz.", "err"); return; }

    const quizzesAvecQuestions = [];
    for (const qz of (quizzes || [])) {
      const { data: questions } = await DB.from("questions").select("*").eq("quiz_id", qz.id).order("ordre");
      quizzesAvecQuestions.push({ ...qz, questions: questions || [] });
    }
    gererMsg("", "");
    afficherLeconGerer(lecon, quizzesAvecQuestions);
  }

  function afficherLeconGerer(lecon, quizzes) {
    gererZone.style.display = "block";
    gererZone.dataset.leconId = lecon.id;
    gererZone.innerHTML =
      '<div style="border-top:2px solid var(--ocre);margin-top:10px;padding-top:20px">'
      + '<div class="le-field"><label>Titre de la leçon</label><input type="text" id="gererTitre" value="' + esc(lecon.titre) + '"></div>'
      + '<div class="le-field"><label>Chapitre (facultatif)</label><input type="text" id="gererChapitre" value="' + esc(lecon.chapitre || "") + '"></div>'
      + '<div class="le-field"><label>Aperçu</label><input type="text" id="gererApercu" value="' + esc(lecon.apercu || "") + '"></div>'
      + '<div class="le-field"><label>Contenu (fiches)</label><div id="gererContenu" class="rte" contenteditable="true" style="min-height:140px;background:#fff;border:1px solid var(--craie-2);border-radius:10px;padding:14px">' + (lecon.contenu || "") + '</div></div>'
      + '<div style="display:flex;gap:10px;margin:14px 0 26px">'
      + '<button class="btn btn-dark" id="gererSaveLecon">Enregistrer la leçon <span>→</span></button>'
      + '<button class="btn btn-ghost" id="gererDelLecon" style="color:var(--rouge);border-color:var(--rouge)">Supprimer toute la leçon</button>'
      + '</div>'
      + '<h3 style="font-family:var(--serif);border-top:1px solid var(--craie-2);padding-top:20px">Quiz rattachés (' + quizzes.length + ')</h3>'
      + '<div id="gererQuizListe"></div>'
      + '<button class="btn btn-ghost" id="gererAddQuiz" style="margin-top:10px">+ Ajouter un nouveau quiz à cette leçon</button>'
      + '</div>';

    const quizListeEl = $("gererQuizListe");
    quizzes.forEach(qz => quizListeEl.appendChild(construireBlocQuiz(qz)));

    $("gererSaveLecon").addEventListener("click", () => sauvegarderLeconGerer(lecon.id));
    $("gererDelLecon").addEventListener("click", () => supprimerLeconGerer(lecon.id, lecon.titre));
    $("gererAddQuiz").addEventListener("click", () => {
      const nouveauBloc = construireBlocQuiz({ id: null, titre: "Nouveau quiz — " + lecon.titre, questions: [] });
      quizListeEl.appendChild(nouveauBloc);
      nouveauBloc.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function construireBlocQuiz(qz) {
    const bloc = document.createElement("div");
    bloc.className = "lecon-editor";
    bloc.style.cssText = "margin:16px 0;background:var(--craie-2)";
    bloc.dataset.quizId = qz.id || "";
    bloc.innerHTML =
      '<div class="le-field"><label>Titre du quiz</label><input type="text" class="gerer-quiz-titre" value="' + esc(qz.titre) + '"></div>'
      + '<div class="gerer-questions"></div>'
      + '<button type="button" class="btn btn-ghost gerer-add-q" style="margin:10px 0">+ Ajouter une question</button>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
      + '<button type="button" class="btn btn-dark gerer-save-quiz">Enregistrer ce quiz <span>→</span></button>'
      + (qz.id ? '<button type="button" class="btn btn-ghost gerer-del-quiz" style="color:var(--rouge);border-color:var(--rouge)">Supprimer ce quiz</button>' : '')
      + '</div>';

    const qContainer = bloc.querySelector(".gerer-questions");
    (qz.questions || []).forEach(q => qContainer.appendChild(construireQuestionGerer(qContainer, q)));
    if (!qz.questions || !qz.questions.length) qContainer.appendChild(construireQuestionGerer(qContainer, null));

    bloc.querySelector(".gerer-add-q").addEventListener("click", () => qContainer.appendChild(construireQuestionGerer(qContainer, null)));
    bloc.querySelector(".gerer-save-quiz").addEventListener("click", () => sauvegarderQuizGerer(bloc));
    const delBtn = bloc.querySelector(".gerer-del-quiz");
    if (delBtn) delBtn.addEventListener("click", () => supprimerQuizGerer(bloc, qz.titre));

    return bloc;
  }

  let gererQCompteur = 0;
  function construireQuestionGerer(container, data) {
    gererQCompteur++;
    const nom = "gerer-bonne-" + gererQCompteur;
    const d = data || {};
    const div = document.createElement("div");
    div.className = "qz-question";
    const lettre = (l, txt) =>
      '<label class="qz-choix">'
      + '<input type="radio" name="' + nom + '" value="' + l + '"' + (d.bonne === l ? " checked" : "") + '>'
      + '<span class="qz-lettre" title="Bonne réponse">' + l.toUpperCase() + '</span>'
      + '<input type="text" class="qz-txt" data-l="' + l + '" placeholder="Choix ' + l.toUpperCase() + '" value="' + esc(d["choix_" + l] || "") + '">'
      + '</label>';
    div.innerHTML =
      '<button type="button" class="qz-del-q">Retirer</button>'
      + '<span class="qz-qnum">Question</span>'
      + '<textarea class="qz-enonce" placeholder="Énoncé de la question…">' + esc(d.enonce || "") + '</textarea>'
      + lettre("a", d.choix_a) + lettre("b", d.choix_b) + lettre("c", d.choix_c) + lettre("d", d.choix_d)
      + '<p class="qz-hint">Clique sur la lettre (A/B/C/D) pour marquer la bonne réponse.</p>';
    div.querySelector(".qz-del-q").addEventListener("click", () => div.remove());
    return div;
  }

  function lireQuestionsDuBloc(bloc) {
    const questions = [];
    bloc.querySelectorAll(".qz-question").forEach((qDiv, i) => {
      const enonce = qDiv.querySelector(".qz-enonce").value.trim();
      const bonne = (qDiv.querySelector('input[type="radio"]:checked') || {}).value;
      const get = l => qDiv.querySelector('.qz-txt[data-l="' + l + '"]').value.trim();
      questions.push({ ordre: i + 1, enonce, bonne, choix_a: get("a"), choix_b: get("b"), choix_c: get("c"), choix_d: get("d") });
    });
    return questions;
  }

  async function sauvegarderLeconGerer(leconId) {
    gererMsg("Enregistrement…", "");
    const champs = {
      titre: $("gererTitre").value.trim(),
      chapitre: $("gererChapitre").value.trim() || null,
      apercu: $("gererApercu").value.trim() || null,
      contenu: $("gererContenu").innerHTML.trim()
    };
    if (!champs.titre) { gererMsg("Le titre est requis.", "err"); return; }
    const { error } = await DB.from("lecons").update(champs).eq("id", leconId);
    if (error) gererMsg("Erreur : " + error.message, "err");
    else gererMsg("Leçon enregistrée.", "ok");
  }

  async function supprimerLeconGerer(leconId, titre) {
    if (!confirm('Supprimer définitivement "' + titre + '" et tous ses quiz rattachés ? Cette action est irréversible.')) return;
    gererMsg("Suppression…", "");
    await DB.from("quiz").delete().eq("lecon_id", leconId);
    const { error } = await DB.from("lecons").delete().eq("id", leconId);
    if (error) { gererMsg("Erreur : " + error.message, "err"); return; }
    gererZone.style.display = "none";
    gererZone.innerHTML = "";
    gererMsg("Leçon et quiz supprimés.", "ok");
    chargerListeLeconsGerer();
  }

  async function sauvegarderQuizGerer(bloc) {
    const quizId = bloc.dataset.quizId;
    const titre = bloc.querySelector(".gerer-quiz-titre").value.trim();
    const questions = lireQuestionsDuBloc(bloc);
    if (!titre) { gererMsg("Le titre du quiz est requis.", "err"); return; }
    if (!questions.length) { gererMsg("Ce quiz n'a aucune question.", "err"); return; }
    const incomplete = questions.findIndex(q => !q.enonce || !q.bonne || !q.choix_a || !q.choix_b || !q.choix_c || !q.choix_d);
    if (incomplete !== -1) { gererMsg("Question " + (incomplete + 1) + " incomplète (énoncé, 4 choix et bonne réponse requis).", "err"); return; }

    gererMsg("Enregistrement du quiz…", "");
    const ent = await monEnt();
    if (!ent) { gererMsg("Connexion perdue (ta session a peut-être expiré). Recharge la page et reconnecte-toi.", "err"); return; }

    let idFinal = quizId;
    if (!quizId) {
      // Nouveau quiz : on le crée avec le même contexte (filière/niveau/matière) que la leçon affichée
      const estSec = sectionActuelle() === "sec";
      const avecSerie = estSec && NIVEAUX_AVEC_SERIE.includes(fiSelNiveau.value);
      const { data: nouveauQz, error: eIns } = await DB.from("quiz").insert({
        entreprise_id: ent,
        filiere: estSec ? (avecSerie ? fiSelSerie.value : null) : selFil.value,
        niveau: estSec ? fiSelNiveau.value : null,
        matiere: estSec ? fiSelMatSec.value : selMat.value,
        domaine: (estSec && fiSelMatSec.value === "Mathématiques" && fiSelDomaine.value) ? fiSelDomaine.value : null,
        titre, duree_sec: 600, type: "lecon",
        lecon_id: gererZone.dataset.leconId,
        publie: true
      }).select("id").single();
      if (eIns) { gererMsg("Erreur : " + eIns.message, "err"); return; }
      idFinal = nouveauQz.id;
      bloc.dataset.quizId = idFinal;
      // ajouter le bouton supprimer maintenant qu'il existe
      if (!bloc.querySelector(".gerer-del-quiz")) {
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn btn-ghost gerer-del-quiz";
        btn.style.cssText = "color:var(--rouge);border-color:var(--rouge)";
        btn.textContent = "Supprimer ce quiz";
        btn.addEventListener("click", () => supprimerQuizGerer(bloc, titre));
        bloc.querySelector('div[style*="flex"]').appendChild(btn);
      }
    } else {
      const { error: eUp } = await DB.from("quiz").update({ titre }).eq("id", quizId);
      if (eUp) { gererMsg("Erreur : " + eUp.message, "err"); return; }
      await DB.from("questions").delete().eq("quiz_id", quizId);
    }

    const rows = questions.map(q => ({ ...q, quiz_id: idFinal }));
    const { error: eQ } = await DB.from("questions").insert(rows);
    if (eQ) { gererMsg("Erreur questions : " + eQ.message, "err"); return; }
    gererMsg("Quiz enregistré (" + questions.length + " questions).", "ok");
  }

  async function supprimerQuizGerer(bloc, titre) {
    const quizId = bloc.dataset.quizId;
    if (!quizId) { bloc.remove(); return; }
    if (!confirm('Supprimer le quiz "' + titre + '" ? Cette action est irréversible.')) return;
    const { error } = await DB.from("quiz").delete().eq("id", quizId);
    if (error) { gererMsg("Erreur : " + error.message, "err"); return; }
    bloc.remove();
    gererMsg("Quiz supprimé.", "ok");
  }
})();

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
  const TRONC_COMMUN = ["Mathématiques", "Français", "Créole", "Anglais", "Histoire-Géographie",
    "Sciences Physiques", "Sciences de la Vie et de la Terre", "Éducation Civique"];
  const SERIES_MATIERES = {
    svt: ["Mathématiques", "Histoire-Géographie", "Physique", "Chimie", "Biologie/Géologie", "Philosophie"],
    smp: ["Mathématiques", "Histoire-Géographie", "Physique", "Chimie", "Philosophie", "Biologie/Géologie"],
    ses: ["Mathématiques", "Histoire-Géographie", "Économie", "Philosophie", "Biologie/Géologie", "Physique", "Chimie"],
    lla: ["Histoire-Géographie", "Anglais", "Espagnol", "Philosophie", "Art et Musique", "Mathématiques", "Chimie"]
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
    const opts = avecSerie ? (SERIES_MATIERES[fiSelSerie.value] || []) : TRONC_COMMUN;
    fiSelMatSec.innerHTML = opts.map(m => '<option>' + esc(m) + '</option>').join("");
  }
  if (fiSelNiveau) fiSelNiveau.addEventListener("change", majMatieresSecondaire);
  if (fiSelSerie) fiSelSerie.addEventListener("change", majMatieresSecondaire);

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
          entreprise_id: ent, filiere, niveau, matiere, titre: d.titre, chapitre: d.chapitre || null, apercu: d.apercu || null,
          contenu: d.contenu_html, publie: true, ordre: ordre
        }).select("id").single();
        if (eLec) throw new Error(eLec.message);
        ordre++;

        let totalQuestions = 0;
        for (const qz of d.quizzes) {
          const titreQuiz = d.quizzes.length > 1 ? qz.sousTitre + " — " + d.titre : "Quiz — " + d.titre;
          const { data: qzRow, error: eQz } = await DB.from("quiz").insert({
            entreprise_id: ent, filiere, niveau, matiere, titre: titreQuiz,
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
})();

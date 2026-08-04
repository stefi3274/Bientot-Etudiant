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
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques"]
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const statusFi = (m, t) => { const el = $("fiMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  const selFil = $("fiFiliere"), selMat = $("fiMatiere");
  function majMat() {
    if (!selFil || !selMat) return;
    selMat.innerHTML = (MATIERES[selFil.value] || []).map(m => "<option>" + m + "</option>").join("");
  }
  if (selFil) { selFil.addEventListener("change", majMat); majMat(); }

  if ($("fiVoirFormat")) $("fiVoirFormat").addEventListener("click", e => {
    e.preventDefault();
    const ex = $("fiExempleFormat");
    ex.style.display = ex.style.display === "none" ? "block" : "none";
  });

  // ---------- Parsing du texte structuré ----------
  function escHtml(s) { return (s || "").replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c])); }

  function texteVersHtml(txt) {
    const paragraphes = txt.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return paragraphes.map(p => {
      const lignes = p.split("\n").map(l => l.trim()).filter(Boolean);
      if (lignes.length && lignes.every(l => /^[-*]\s+/.test(l))) {
        return "<ul>" + lignes.map(l => "<li>" + escHtml(l.replace(/^[-*]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      if (/^##\s+/.test(p)) return "<h3>" + escHtml(p.replace(/^##\s+/, "")) + "</h3>";
      return "<p>" + escHtml(p).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
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

  function parseUneLecon(bloc) {
    const idxQuiz = bloc.search(/^===QUIZ===$/im);
    if (idxQuiz < 0) throw new Error("Marqueur ===QUIZ=== manquant.");
    const avant = bloc.slice(0, idxQuiz);
    const apres = bloc.slice(idxQuiz).replace(/^===QUIZ===$/im, "").trim();

    const titreMatch = avant.match(/^TITRE\s*:\s*(.+)$/im);
    const apercuMatch = avant.match(/^APERCU\s*:\s*(.+)$/im);
    if (!titreMatch) throw new Error("Ligne TITRE: manquante.");

    let contenuBrut = avant;
    const idxSep = avant.search(/^---$/m);
    if (idxSep >= 0) contenuBrut = avant.slice(idxSep + 3);
    else contenuBrut = avant.replace(/^TITRE\s*:.*$/im, "").replace(/^APERCU\s*:.*$/im, "");

    const questions = parseQuestions(apres);
    if (!questions.length) throw new Error('Aucune question trouvée après "===QUIZ===" pour la leçon "' + titreMatch[1].trim() + '".');
    questions.forEach((q, i) => {
      if (!q.choix_a || !q.choix_b || !q.choix_c || !q.choix_d) {
        throw new Error("Question " + (i + 1) + ' de "' + titreMatch[1].trim() + '" : il manque un choix A/B/C/D (format "A) ...").');
      }
    });

    return {
      titre: titreMatch[1].trim(),
      apercu: apercuMatch ? apercuMatch[1].trim() : "",
      contenu_html: texteVersHtml(contenuBrut.trim()),
      questions
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

    const filiere = selFil.value, matiere = selMat.value;
    const ent = await monEnt();
    if (!ent) { statusFi("Entreprise introuvable.", "err"); $("fiPublier").disabled = false; return; }

    const { count } = await DB.from("lecons").select("id", { count: "exact", head: true }).eq("filiere", filiere).eq("matiere", matiere);
    let ordre = (count || 0) + 1;

    let ok = 0, erreurs = [], resume = [];
    for (const d of lecons) {
      try {
        const { data: lec, error: eLec } = await DB.from("lecons").insert({
          entreprise_id: ent, filiere, matiere, titre: d.titre, apercu: d.apercu || null,
          contenu: d.contenu_html, publie: true, ordre: ordre
        }).select("id").single();
        if (eLec) throw new Error(eLec.message);
        ordre++;

        const { data: qz, error: eQz } = await DB.from("quiz").insert({
          entreprise_id: ent, filiere, matiere, titre: "Quiz — " + d.titre,
          duree_sec: 600, type: "lecon", lecon_id: lec.id, publie: true
        }).select("id").single();
        if (eQz) throw new Error(eQz.message);

        const rows = d.questions.map((q, i) => ({
          quiz_id: qz.id, ordre: i + 1, enonce: q.enonce,
          choix_a: q.choix_a, choix_b: q.choix_b, choix_c: q.choix_c, choix_d: q.choix_d, bonne: q.bonne
        }));
        const { error: eQ } = await DB.from("questions").insert(rows);
        if (eQ) throw new Error(eQ.message);

        ok++;
        resume.push("<li><b>" + esc(d.titre) + "</b> — " + d.questions.length + " questions</li>");
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

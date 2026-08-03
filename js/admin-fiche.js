/* ============================================================
   Admin — Fiche : formulaire combiné leçon + quiz, pour l'admin
   lui-même. Un seul écran, une seule publication.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale"],
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

  // ---------- Questions dynamiques (même style visuel que l'onglet Quiz) ----------
  let qCount = 0;
  const qBox = $("fiQuestions");

  function ajouterQuestion() {
    qCount++;
    const n = qCount;
    const div = document.createElement("div");
    div.className = "qz-question";
    div.dataset.q = n;
    const lettre = l =>
      '<label class="qz-choix">'
      + '<input type="radio" name="fi-bonne-' + n + '" value="' + l + '"' + (l === "a" ? " checked" : "") + '>'
      + '<span class="qz-lettre" title="Bonne réponse">' + l.toUpperCase() + '</span>'
      + '<input type="text" class="qz-txt" data-l="' + l + '" placeholder="Choix ' + l.toUpperCase() + '">'
      + '</label>';
    div.innerHTML =
      '<button type="button" class="qz-del-q">Retirer</button>'
      + '<span class="qz-qnum">Question ' + n + '</span>'
      + '<textarea class="qz-enonce" placeholder="Énoncé de la question…"></textarea>'
      + lettre("a") + lettre("b") + lettre("c") + lettre("d")
      + '<p class="qz-hint">Clique sur la lettre (A/B/C/D) pour marquer la bonne réponse.</p>';
    qBox.appendChild(div);
    div.querySelector(".qz-del-q").addEventListener("click", () => { div.remove(); renumeroter(); });
  }

  function renumeroter() {
    qBox.querySelectorAll(".qz-question").forEach((el, i) => {
      el.querySelector(".qz-qnum").textContent = "Question " + (i + 1);
    });
  }

  if ($("fiAddQ")) $("fiAddQ").addEventListener("click", ajouterQuestion);
  if (qBox) ajouterQuestion(); // une question par défaut à l'ouverture

  // ---------- Conversion texte brut -> HTML simple ----------
  function texteVersHtml(txt) {
    const paragraphes = txt.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return paragraphes.map(p => {
      const lignes = p.split("\n").map(l => l.trim()).filter(Boolean);
      if (lignes.length && lignes.every(l => /^[-*]\s+/.test(l))) {
        return "<ul>" + lignes.map(l => "<li>" + esc(l.replace(/^[-*]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
  }

  async function monEnt() {
    const { data: prof } = await DB.from("profils").select("entreprise_id").maybeSingle();
    return prof ? prof.entreprise_id : null;
  }

  // ---------- Publication ----------
  if ($("fiPublier")) $("fiPublier").addEventListener("click", async () => {
    const titre = ($("fiTitre").value || "").trim();
    if (!titre) { statusFi("Le titre est obligatoire.", "err"); return; }

    const questionsEls = [...qBox.querySelectorAll(".qz-question")];
    if (!questionsEls.length) { statusFi("Ajoute au moins une question.", "err"); return; }

    const questions = [];
    for (let i = 0; i < questionsEls.length; i++) {
      const el = questionsEls[i];
      const enonce = el.querySelector(".qz-enonce").value.trim();
      const choix = {};
      el.querySelectorAll(".qz-txt").forEach(inp => { choix[inp.dataset.l] = inp.value.trim(); });
      const radio = el.querySelector('input[type="radio"]:checked');
      if (!enonce || !choix.a || !choix.b || !choix.c || !choix.d) {
        statusFi("Question " + (i + 1) + " : énoncé et 4 choix sont obligatoires.", "err");
        return;
      }
      questions.push({ enonce, choix_a: choix.a, choix_b: choix.b, choix_c: choix.c, choix_d: choix.d, bonne: radio ? radio.value : "a" });
    }

    if (typeof DB === "undefined" || !DB) { statusFi("Connexion Supabase indisponible.", "err"); return; }

    $("fiPublier").disabled = true;
    statusFi("Publication en cours…", "");

    try {
      const ent = await monEnt();
      if (!ent) { statusFi("Entreprise introuvable.", "err"); return; }

      const filiere = selFil.value, matiere = selMat.value;
      const { count } = await DB.from("lecons").select("id", { count: "exact", head: true }).eq("filiere", filiere).eq("matiere", matiere);

      const { data: lec, error: eLec } = await DB.from("lecons").insert({
        entreprise_id: ent, filiere, matiere, titre,
        apercu: ($("fiApercu").value || "").trim() || null,
        contenu: texteVersHtml(($("fiContenu").value || "").trim()),
        publie: true, ordre: (count || 0) + 1
      }).select("id").single();
      if (eLec) throw new Error(eLec.message);

      const { data: qz, error: eQz } = await DB.from("quiz").insert({
        entreprise_id: ent, filiere, matiere, titre: "Quiz — " + titre,
        duree_sec: 600, type: "lecon", lecon_id: lec.id, publie: true
      }).select("id").single();
      if (eQz) throw new Error(eQz.message);

      const rows = questions.map((q, i) => ({
        quiz_id: qz.id, ordre: i + 1, enonce: q.enonce,
        choix_a: q.choix_a, choix_b: q.choix_b, choix_c: q.choix_c, choix_d: q.choix_d, bonne: q.bonne
      }));
      const { error: eQ } = await DB.from("questions").insert(rows);
      if (eQ) throw new Error(eQ.message);

      statusFi("Leçon et quiz publiés avec succès !", "ok");
      $("fiTitre").value = ""; $("fiApercu").value = ""; $("fiContenu").value = "";
      qBox.innerHTML = ""; qCount = 0; ajouterQuestion();
    } catch (e) {
      statusFi("Erreur : " + e.message, "err");
    } finally {
      $("fiPublier").disabled = false;
    }
  });
})();

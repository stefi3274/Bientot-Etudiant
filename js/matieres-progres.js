/* ============================================================
   Barres de progression par matière sur matieres.html.
   Connectés uniquement — invités voient juste "Leçons · Quiz · Examens"
   comme avant, sans appel supplémentaire.
   ============================================================ */
(function () {
  (async function () {
    if (typeof DB === "undefined" || !DB) return;
    if (typeof eleveActuel !== "function") return;

    let el;
    try { el = await eleveActuel(); } catch (e) { return; }
    if (!el || !el.nom || !el.user_id) return;

    const cartes = document.querySelectorAll("a.mat[href*='matiere.html']");
    if (!cartes.length) return;

    // Totaux publiés par matière (toutes filières confondues pour transversales,
    // sinon la même matière peut exister sous plusieurs filières — on additionne)
    const [{ data: lecons }, { data: quiz }] = await Promise.all([
      DB.from("lecons").select("id, matiere").eq("publie", true),
      DB.from("quiz").select("id, matiere").eq("publie", true)
    ]);
    const totalLeconsParMatiere = {}, totalQuizParMatiere = {};
    (lecons || []).forEach(l => { totalLeconsParMatiere[l.matiere] = (totalLeconsParMatiere[l.matiere] || 0) + 1; });
    (quiz || []).forEach(q => { totalQuizParMatiere[q.matiere] = (totalQuizParMatiere[q.matiere] || 0) + 1; });

    // Ce que l'élève a déjà fait, par matière
    const [{ data: vues }, { data: tentatives }] = await Promise.all([
      DB.from("lecons_vues").select("lecon_id, lecons(matiere)").eq("user_id", el.user_id),
      DB.from("tentatives").select("quiz_id, matiere").eq("user_id", el.user_id)
    ]);
    const faitLeconsParMatiere = {}, quizFaitsParMatiere = {};
    (vues || []).forEach(v => {
      const mat = v.lecons && v.lecons.matiere;
      if (!mat) return;
      faitLeconsParMatiere[mat] = (faitLeconsParMatiere[mat] || 0) + 1;
    });
    (tentatives || []).forEach(t => {
      if (!t.matiere) return;
      const dejaVu = quizFaitsParMatiere[t.matiere + "|" + t.quiz_id];
      if (dejaVu) return; // ne compte qu'une fois par quiz distinct
      quizFaitsParMatiere[t.matiere + "|" + t.quiz_id] = true;
      quizFaitsParMatiere[t.matiere] = (quizFaitsParMatiere[t.matiere] || 0) + 1;
    });

    cartes.forEach(carte => {
      const url = new URL(carte.getAttribute("href"), location.href);
      const m = decodeURIComponent(url.searchParams.get("m") || "");
      if (!m) return;
      const totalL = totalLeconsParMatiere[m] || 0;
      const totalQ = totalQuizParMatiere[m] || 0;
      if (!totalL && !totalQ) return;
      const faitL = faitLeconsParMatiere[m] || 0;
      const faitQ = quizFaitsParMatiere[m] || 0;
      const total = totalL + totalQ, fait = faitL + faitQ;
      const pct = total ? Math.round(100 * fait / total) : 0;

      const meta = carte.querySelector(".m-meta");
      if (meta) {
        meta.outerHTML =
          '<div class="m-progres">'
          + '<div class="m-progres-barre"><div class="m-progres-remplie" style="width:' + pct + '%"></div></div>'
          + '<span class="m-progres-txt">' + faitL + '/' + totalL + ' le\u00e7ons \u00b7 ' + faitQ + '/' + totalQ + ' quiz</span>'
          + '</div>';
      }
    });
  })();
})();

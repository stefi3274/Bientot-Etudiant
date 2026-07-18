/* ============================================================
   Classement : par quiz OU global par matière
   Paliers : >100→top100, <100→top50, <50→top30, <20→top10, <10→top3
   ============================================================ */
(function () {
  const zone = document.getElementById("classementZone");
  if (!zone) return;
  const params = new URLSearchParams(location.search);
  const quizId = params.get("quiz");
  const matiere = params.get("matiere");
  const filiere = params.get("f");
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmtTemps = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");

  function palier(n) {
    if (n >= 100) return 100;
    if (n >= 50) return 50;
    if (n >= 20) return 30;
    if (n >= 10) return 20;   // <20 → top 10 ; on garde 10 ci-dessous
    return n;                  // très peu de participants
  }
  function nbAffiches(n) {
    if (n >= 100) return 100;
    if (n >= 50) return 50;
    if (n >= 20) return 30;
    if (n >= 10) return 10;
    return 3;
  }

  (async function () {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = msgAttente(); return; }

    let titre = "Classement";
    let q = DB.from("tentatives").select("nom, score, total, temps_sec, user_id, quiz_id");

    if (quizId) {
      const { data: qz } = await DB.from("quiz").select("titre, matiere, filiere").eq("id", quizId).maybeSingle();
      if (qz) { titre = qz.titre; if (qz.filiere) document.body.setAttribute("data-filiere", qz.filiere); }
      q = q.eq("quiz_id", quizId);
    } else if (matiere) {
      titre = "Classement · " + matiere;
      if (filiere) document.body.setAttribute("data-filiere", filiere);
      q = q.eq("matiere", matiere);
    }

    const { data, error } = await q;
    setTitre(titre);

    if (error || !data || data.length === 0) { zone.innerHTML = msgAttente(); return; }

    // Pour un classement GLOBAL par matière : garder la MEILLEURE tentative par personne
    let liste = data;
    if (!quizId && matiere) {
      const best = new Map();
      data.forEach(t => {
        const k = t.user_id || t.nom;
        const cur = best.get(k);
        if (!cur || t.score > cur.score || (t.score === cur.score && t.temps_sec < cur.temps_sec)) best.set(k, t);
      });
      liste = Array.from(best.values());
    }

    // trier : score desc, puis temps asc
    liste.sort((a,b) => b.score - a.score || a.temps_sec - b.temps_sec);

    const total = liste.length;
    const nMontre = nbAffiches(total);
    const top = liste.slice(0, nMontre);

    zone.innerHTML =
      '<div class="cls-head">'
      + '<p class="cls-count">' + total + ' participant' + (total>1?'s':'') + ' · '
      + (total >= 10 ? 'Top ' + nMontre : 'Les ' + nMontre + ' premiers') + '</p>'
      + '</div>'
      + '<div class="cls-table">'
      + '<div class="cls-row cls-th"><span>Place</span><span>Nom</span><span>Score</span><span>Temps</span></div>'
      + top.map((t, i) => {
          const place = i + 1;
          const medaille = place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : place;
          return '<div class="cls-row' + (place<=3?' cls-podium':'') + '">'
            + '<span class="cls-place">' + medaille + '</span>'
            + '<span class="cls-nom">' + esc(t.nom || "Anonyme") + '</span>'
            + '<span class="cls-score">' + t.score + '/' + t.total + '</span>'
            + '<span class="cls-temps">' + fmtTemps(t.temps_sec) + '</span>'
            + '</div>';
        }).join("")
      + '</div>';
  })();

  function setTitre(t) {
    const el = document.getElementById("clsTitre");
    if (el) el.textContent = t;
    document.title = t + " · Bientôt Étudiant";
  }
  function msgAttente() {
    return '<div class="cls-vide">'
      + '<div class="wi" style="margin:0 auto 14px;width:56px;height:56px;border-radius:14px;background:rgba(232,184,75,.18);display:flex;align-items:center;justify-content:center;color:var(--ocre-d);font-size:1.6rem">⏳</div>'
      + '<h3>En attente des résultats</h3>'
      + '<p>Le classement s\'affichera dès que des postulant.e.s auront passé ce quiz. Sois le premier !</p>'
      + '</div>';
  }
})();

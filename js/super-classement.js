/* ============================================================
   Classement du Super Quiz — même logique de paliers que
   classement.js, sourcée depuis super_tentatives. On garde la
   MEILLEURE tentative de chaque personne (score desc, temps asc).
   ============================================================ */
(function () {
  const zone = document.getElementById("classementZone");
  if (!zone) return;
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const fmtTemps = s => Math.floor(s/60) + ":" + String(s%60).padStart(2,"0");

  function nbAffiches(n) {
    if (n >= 100) return 100;
    if (n >= 50) return 50;
    if (n >= 20) return 30;
    if (n >= 10) return 10;
    return 3;
  }

  (async function () {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = msgAttente(); return; }

    const { data, error } = await DB.from("super_tentatives").select("nom, score, total, temps_sec, user_id");
    if (error || !data || !data.length) { zone.innerHTML = msgAttente(); return; }

    // meilleure tentative par personne : % de score desc, puis temps asc
    const best = new Map();
    data.forEach(t => {
      const k = t.user_id || t.nom;
      const pct = t.total ? t.score / t.total : 0;
      const cur = best.get(k);
      const curPct = cur ? (cur.total ? cur.score / cur.total : 0) : -1;
      if (!cur || pct > curPct || (pct === curPct && t.temps_sec < cur.temps_sec)) best.set(k, t);
    });
    const liste = Array.from(best.values())
      .sort((a, b) => (b.score / b.total) - (a.score / a.total) || a.temps_sec - b.temps_sec);

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

  function msgAttente() {
    return '<div class="cls-vide">'
      + '<div class="wi" style="margin:0 auto 14px;width:56px;height:56px;border-radius:14px;background:rgba(232,184,75,.18);display:flex;align-items:center;justify-content:center;color:var(--ocre-d);font-size:1.6rem">⏳</div>'
      + '<h3>En attente des résultats</h3>'
      + '<p>Le classement s\'affichera dès que des postulant.e.s auront fait le Super Quiz. Sois le premier !</p>'
      + '</div>';
  }
})();

/* Page matière — affiche les leçons, ou le message d'attente */
(function () {
  const params = new URLSearchParams(location.search);
  const m = params.get("m") || "Matière";
  const f = params.get("f") || "";

  const filiereNoms = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  document.title = m + " · Bientôt Étudiant";
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt("mTitre", m);
  setTxt("mBread", m);
  setTxt("mFiliere", filiereNoms[f] || "Matière");
  if (f) document.body.setAttribute("data-filiere", f);

  const zone = document.getElementById("leconsZone");
  if (!zone) return;

  function messageAttente() {
    zone.innerHTML =
      '<div class="soon">'
      + '<span class="badge">En préparation</span>'
      + '<div class="m-emoji" data-icon="lecon"></div>'
      + '<h2>Le contenu arrive bientôt</h2>'
      + '<p>Les leçons de cette matière sont en préparation. Chaque contenu est vérifié avant publication.</p>'
      + '<p><strong>Tu as des ressources de qualité ?</strong> Aide les futurs postulant.e.s en contribuant.</p>'
      + '<div class="soon-actions">'
      + '<a href="contact.html" class="btn btn-dark">Me prévenir <span>&rarr;</span></a>'
      + '<a href="contribuer.html" class="btn btn-primary">Contribuer <span>&rarr;</span></a>'
      + '</div></div>';
    if (window.__renderIcons) window.__renderIcons();
  }

  (async function () {
    if (typeof DB === "undefined" || !DB) { messageAttente(); return; }
    const { data, error } = await DB.from("lecons")
      .select("id, titre, apercu, ordre, pdf_url, auteur")
      .eq("filiere", f).eq("matiere", m).eq("publie", true)
      .order("ordre", { ascending: true });

    if (error || !data || data.length === 0) { messageAttente(); return; }

    const cartes = data.map(l =>
      '<a class="lecon-carte" href="lecon.html?id=' + l.id + '">'
      + '<span class="lc-num">Le\u00e7on ' + (l.ordre || 1) + '</span>'
      + '<h3>' + esc(l.titre) + '</h3>'
      + (l.apercu ? '<p>' + esc(l.apercu) + '</p>' : '')
      + '<span class="lc-go">Lire la le\u00e7on \u2192</span>'
      + (l.pdf_url ? '<span class="lc-pdf">PDF disponible</span>' : '')
      + '</a>'
    ).join("");

    zone.innerHTML =
      '<div class="lecons-head"><h2>' + data.length + (data.length > 1 ? ' le\u00e7ons disponibles' : ' le\u00e7on disponible') + '</h2></div>'
      + '<div class="lecons-grid">' + cartes + '</div>';
  })();
})();

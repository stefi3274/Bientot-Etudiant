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
  const TRANSVERSALES = ["Français", "Culture générale"];
  const transversale = TRANSVERSALES.includes(m);
  let userId = null, doneQuizIds = new Set(), doneLeconIds = new Set();
  function badgeStatut(fait) {
    return userId ? ('<span class="statut-badge ' + (fait ? "fait" : "a-faire") + '">' + (fait ? "✓ Déjà fait" : "À faire") + '</span>') : "";
  }

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
      '<div class="soon" id="soonBloc">'
      + '<span class="badge">En préparation</span>'
      + '<div class="m-emoji" data-icon="lecon"></div>'
      + '<h2>Les leçons arrivent bientôt</h2>'
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

    if (typeof eleveActuel === "function") {
      try {
        const el = await eleveActuel();
        if (el && el.nom && el.user_id) {
          userId = el.user_id;
          const [{ data: tentatives }, { data: vues }] = await Promise.all([
            DB.from("tentatives").select("quiz_id").eq("user_id", userId),
            DB.from("lecons_vues").select("lecon_id").eq("user_id", userId)
          ]);
          doneQuizIds = new Set((tentatives || []).map(t => t.quiz_id));
          doneLeconIds = new Set((vues || []).map(v => v.lecon_id));
        }
      } catch (e) { /* invité */ }
    }

    let qLec = DB.from("lecons").select("id, titre, apercu, ordre, pdf_url, auteur").eq("matiere", m).eq("publie", true);
    if (!transversale) qLec = qLec.eq("filiere", f);
    const { data, error } = await qLec.order("ordre", { ascending: true });

    if (error || !data || data.length === 0) { messageAttente(); chargerQuiz(); return; }

    const cartes = data.map(l =>
      '<a class="lecon-carte" href="lecon.html?id=' + l.id + '">'
      + badgeStatut(doneLeconIds.has(l.id))
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

    chargerQuiz();
  })();

  // ---------- Quiz de la matière (tous types : liés à une leçon + quiz du dimanche) ----------
  async function chargerQuiz() {
    if (typeof DB === "undefined" || !DB) return;
    let qQz = DB.from("quiz").select("id, titre, duree_sec, type, questions(count)").eq("matiere", m).eq("publie", true);
    if (!transversale) qQz = qQz.eq("filiere", f);
    const { data } = await qQz.order("created_at", { ascending: false });
    if (!data || data.length === 0) return;

    const cartes = data.map(q => {
      const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
      const estDimanche = q.type === "dimanche";
      return '<a class="lecon-carte quiz-carte' + (estDimanche ? ' libre' : '') + '" href="quiz.html?id=' + q.id + '">'
        + badgeStatut(doneQuizIds.has(q.id))
        + '<span class="lc-num">' + (estDimanche ? 'Quiz Libre' : 'Quiz') + '</span>'
        + '<h3>' + esc(q.titre) + '</h3>'
        + '<p>' + nbQ + ' questions \u00b7 ' + Math.round(q.duree_sec/60) + ' min chronom\u00e9tr\u00e9es</p>'
        + '<span class="lc-go">Relever le d\u00e9fi \u2192</span></a>';
    }).join("");

    const bloc = document.createElement("div");
    bloc.innerHTML =
      '<div class="lecons-head" style="margin-top:40px"><h2>' + data.length + (data.length > 1 ? ' quiz disponibles' : ' quiz disponible') + '</h2></div>'
      + '<div class="lecons-grid">' + cartes + '</div>';
    zone.appendChild(bloc);
  }
})();

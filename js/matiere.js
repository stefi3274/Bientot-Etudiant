/* Page matière — onglets Leçons / Quiz, avec message d'attente si vide */
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
  function badgeNouveau(createdAt) {
    if (!createdAt) return "";
    const age = Date.now() - new Date(createdAt).getTime();
    return age < 5 * 24 * 60 * 60 * 1000 ? '<span class="badge-nouveau">Nouveau</span>' : "";
  }

  document.title = m + " · Bientôt Étudiant";
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt("mTitre", m);
  setTxt("mBread", m);
  setTxt("mFiliere", filiereNoms[f] || "Matière");
  if (f) document.body.setAttribute("data-filiere", f);

  const zoneLecons = document.getElementById("leconsContenu");
  const zoneQuiz = document.getElementById("quizContenu");
  const onglets = document.getElementById("matOnglets");
  if (!zoneLecons) return;

  // Bascule entre les deux onglets (affichés seulement si les deux ont du contenu)
  function activerOnglet(nom) {
    document.querySelectorAll("#matOnglets .mat-onglet").forEach(b =>
      b.classList.toggle("on", b.getAttribute("data-tab") === nom));
    zoneLecons.style.display = nom === "lecons" ? "block" : "none";
    zoneQuiz.style.display = nom === "quiz" ? "block" : "none";
  }
  if (onglets) {
    onglets.querySelectorAll(".mat-onglet").forEach(b =>
      b.addEventListener("click", () => activerOnglet(b.getAttribute("data-tab"))));
  }

  function messageAttente() {
    zoneLecons.innerHTML =
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

  // Affiche les onglets seulement si leçons ET quiz ont du contenu — sinon,
  // pas de bascule inutile, on montre simplement ce qu'il y a.
  function majOngletsVisibles(nbLecons, nbQuiz) {
    if (!onglets) return;
    const labelLecons = onglets.querySelector('[data-tab="lecons"]');
    const labelQuiz = onglets.querySelector('[data-tab="quiz"]');
    if (labelLecons) labelLecons.textContent = "Leçons (" + nbLecons + ")";
    if (labelQuiz) labelQuiz.textContent = "Quiz (" + nbQuiz + ")";
    if (nbLecons > 0 && nbQuiz > 0) {
      onglets.style.display = "flex";
      activerOnglet("lecons");
    } else {
      onglets.style.display = "none";
      zoneLecons.style.display = "block";
      zoneQuiz.style.display = "block";
    }
  }

  let dernierNbQuiz = 0;

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

    let qLec = DB.from("lecons").select("id, titre, chapitre, apercu, ordre, pdf_url, auteur, created_at").eq("matiere", m).eq("publie", true);
    if (!transversale) qLec = qLec.eq("filiere", f);
    const { data, error } = await qLec.order("ordre", { ascending: true });

    if (error || !data || data.length === 0) { messageAttente(); await chargerQuiz(); majOngletsVisibles(0, dernierNbQuiz); afficherProgres(0, 0, dernierNbQuiz, doneQuizIds.size); return; }

    const carteLecon = l =>
      '<a class="lecon-carte" href="lecon.html?id=' + l.id + '">'
      + badgeNouveau(l.created_at)
      + badgeStatut(doneLeconIds.has(l.id))
      + '<span class="lc-num">Le\u00e7on ' + (l.ordre || 1) + '</span>'
      + '<h3>' + esc(l.titre) + '</h3>'
      + (l.apercu ? '<p>' + esc(l.apercu) + '</p>' : '')
      + '<span class="lc-go">Lire la le\u00e7on \u2192</span>'
      + (l.pdf_url ? '<span class="lc-pdf">PDF disponible</span>' : '')
      + '</a>';

    const entete = '<div class="lecons-head"><h2>' + data.length + (data.length > 1 ? ' le\u00e7ons disponibles' : ' le\u00e7on disponible') + '</h2></div>';
    const aDesChapitres = data.some(l => l.chapitre);

    if (!aDesChapitres) {
      zoneLecons.innerHTML = entete + '<div class="lecons-grid">' + data.map(carteLecon).join("") + '</div>';
    } else {
      // Regrouper par chapitre en gardant l'ordre d'apparition ; les leçons sans
      // chapitre sont rassemblées dans un groupe générique.
      const groupes = []; const index = {};
      data.forEach(l => {
        const cle = l.chapitre || "Autres le\u00e7ons";
        if (!(cle in index)) { index[cle] = groupes.length; groupes.push({ nom: cle, lecons: [] }); }
        groupes[index[cle]].lecons.push(l);
      });
      zoneLecons.innerHTML = entete + groupes.map(g =>
        '<h3 class="chapitre-titre">' + esc(g.nom) + '</h3>'
        + '<div class="lecons-grid">' + g.lecons.map(carteLecon).join("") + '</div>'
      ).join("");
    }

    await chargerQuiz();
    majOngletsVisibles(data.length, dernierNbQuiz);
    afficherProgres(data.length, doneLeconIds.size, dernierNbQuiz, doneQuizIds.size);
  })();

  function afficherProgres(totalL, faitL, totalQ, faitQ) {
    const zone = document.getElementById("mProgres");
    if (!zone || !userId) return;
    const total = totalL + totalQ, fait = faitL + faitQ;
    if (!total) return;
    const pct = Math.round(100 * fait / total);
    zone.innerHTML =
      '<div class="m-progres" style="max-width:360px;margin-top:14px">'
      + '<div class="m-progres-barre"><div class="m-progres-remplie" style="width:' + pct + '%"></div></div>'
      + '<span class="m-progres-txt">' + faitL + '/' + totalL + ' le\u00e7ons \u00b7 ' + faitQ + '/' + totalQ + ' quiz \u00b7 ' + pct + '%</span>'
      + '</div>';
  }

  // ---------- Quiz de la matière (tous types : liés à une leçon + quiz du dimanche) ----------
  async function chargerQuiz() {
    if (typeof DB === "undefined" || !DB) return;
    let qQz = DB.from("quiz").select("id, titre, duree_sec, type, created_at, questions(count)").eq("matiere", m).eq("publie", true);
    if (!transversale) qQz = qQz.eq("filiere", f);
    const { data } = await qQz.order("created_at", { ascending: false });
    dernierNbQuiz = (data || []).length;
    if (!data || data.length === 0) { zoneQuiz.innerHTML = ""; return; }

    const cartes = data.map(q => {
      const nbQ = (q.questions && q.questions[0]) ? q.questions[0].count : 0;
      const estDimanche = q.type === "dimanche";
      return '<a class="lecon-carte quiz-carte' + (estDimanche ? ' libre' : '') + '" href="quiz.html?id=' + q.id + '">'
        + badgeNouveau(q.created_at)
        + badgeStatut(doneQuizIds.has(q.id))
        + '<span class="lc-num">' + (estDimanche ? 'Quiz Libre' : 'Quiz') + '</span>'
        + '<h3>' + esc(q.titre) + '</h3>'
        + '<p>' + nbQ + ' questions \u00b7 ' + Math.round(q.duree_sec/60) + ' min chronom\u00e9tr\u00e9es</p>'
        + '<span class="lc-go">Relever le d\u00e9fi \u2192</span></a>';
    }).join("");

    zoneQuiz.innerHTML =
      '<div class="lecons-head"><h2>' + data.length + (data.length > 1 ? ' quiz disponibles' : ' quiz disponible') + '</h2></div>'
      + '<div class="lecons-grid">' + cartes + '</div>';
  }
})();

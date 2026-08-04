/* ============================================================
   Admin — Tableau de bord : vue d'ensemble complète.
   Élèves, leçons, quiz, tentatives, score moyen, contributions
   en attente, répartition par filière, progression par élève,
   activité récente.

   Note : les comptages sont dérivés des données réellement
   récupérées (.length), pas d'un count "head:true" — ce dernier
   s'est révélé peu fiable (renvoie parfois null/0 même quand des
   lignes existent), d'où l'écart observé entre la carte "Élèves
   inscrits" et la répartition par filière.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const FILIERES = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };
  const dateFr = iso => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  let charge = false;

  window.chargerDashboard = async function () {
    if (typeof DB === "undefined" || !DB) return;
    if (charge) return; // évite les rechargements simultanés
    charge = true;

    const cartes = $("dbCartes"), filieresBox = $("dbFilieres"), activiteBox = $("dbActivite"), msg = $("dbMsg");
    if (!cartes) { charge = false; return; }

    try {
      const [
        { data: eleves },
        { data: lecons },
        { data: quizList },
        { data: toutesTentatives },
        { data: contribAttente },
        { data: activiteRecente }
      ] = await Promise.all([
        DB.from("eleves").select("user_id, nom, filieres"),
        DB.from("lecons").select("filiere").eq("publie", true),
        DB.from("quiz").select("filiere").eq("publie", true),
        DB.from("tentatives").select("user_id, nom, score, total, created_at"),
        DB.from("contributions").select("id").eq("statut", "a_verifier"),
        DB.from("tentatives").select("nom, score, total, matiere, created_at").order("created_at", { ascending: false }).limit(8)
      ]);

      const nbEleves = (eleves || []).length;
      const nbLecons = (lecons || []).length;
      const nbQuiz = (quizList || []).length;
      const nbTentatives = (toutesTentatives || []).length;
      const nbContribAttente = (contribAttente || []).length;

      let scoreMoyen = "—";
      if (toutesTentatives && toutesTentatives.length) {
        const pct = toutesTentatives.reduce((acc, t) => acc + (t.total ? t.score / t.total : 0), 0) / toutesTentatives.length;
        scoreMoyen = Math.round(pct * 100) + "%";
      }

      // ---------- Cartes KPI ----------
      cartes.innerHTML = [
        ["Élèves inscrits", nbEleves],
        ["Leçons publiées", nbLecons],
        ["Quiz publiés", nbQuiz],
        ["Quiz passés", nbTentatives],
        ["Score moyen", scoreMoyen],
        ["Contributions à vérifier", nbContribAttente]
      ].map(([label, val]) =>
        '<div class="db-carte"><div class="db-n">' + esc(String(val)) + '</div><div class="db-l">' + esc(label) + '</div></div>'
      ).join("");

      if (nbContribAttente > 0) {
        msg.textContent = nbContribAttente + " contribution(s) en attente de vérification.";
        msg.className = "status-msg on";
      } else {
        msg.className = "status-msg";
      }

      // ---------- Répartition par filière ----------
      const compteFil = { f1: { eleves: 0, lecons: 0, quiz: 0 }, f2: { eleves: 0, lecons: 0, quiz: 0 }, f3: { eleves: 0, lecons: 0, quiz: 0 } };
      (eleves || []).forEach(e => (e.filieres || []).forEach(f => { if (compteFil[f]) compteFil[f].eleves++; }));
      (lecons || []).forEach(l => { if (compteFil[l.filiere]) compteFil[l.filiere].lecons++; });
      (quizList || []).forEach(q => { if (compteFil[q.filiere]) compteFil[q.filiere].quiz++; });

      const maxEleves = Math.max(1, ...Object.values(compteFil).map(f => f.eleves));
      filieresBox.innerHTML = Object.keys(FILIERES).map(f => {
        const c = compteFil[f];
        const largeur = Math.round((c.eleves / maxEleves) * 100);
        return '<div class="db-fil-row">'
          + '<span class="db-fil-nom">' + esc(FILIERES[f]) + '</span>'
          + '<span class="db-fil-bar"><span style="width:' + largeur + '%"></span></span>'
          + '<span class="db-fil-chiffres">' + c.eleves + ' élève' + (c.eleves > 1 ? "s" : "") + ' · ' + c.lecons + ' leçons · ' + c.quiz + ' quiz</span>'
          + '</div>';
      }).join("");
      if (nbEleves === 0) {
        filieresBox.innerHTML += '<p class="empty" style="margin-top:10px">Un élève peut appartenir à plusieurs filières ; la somme des lignes peut donc dépasser le nombre total d\'élèves.</p>';
      }

      // ---------- Activité récente ----------
      if (!activiteRecente || !activiteRecente.length) {
        activiteBox.innerHTML = '<p class="empty">Aucune tentative de quiz enregistrée pour le moment.</p>';
      } else {
        activiteBox.innerHTML = activiteRecente.map(t => {
          const pct = t.total ? Math.round(100 * t.score / t.total) : 0;
          return '<div class="db-activite">'
            + '<span class="db-nom">' + esc(t.nom || "Anonyme") + '</span>'
            + '<span>' + esc(t.matiere || "") + '</span>'
            + '<span class="db-score ' + (pct >= 50 ? "ok" : "low") + '">' + t.score + '/' + t.total + ' (' + pct + '%)</span>'
            + '<span style="color:var(--encre-2);font-size:.82rem">' + dateFr(t.created_at) + '</span>'
            + '</div>';
        }).join("");
      }
    } catch (e) {
      cartes.innerHTML = '<p class="empty">Erreur de chargement du tableau de bord : ' + esc(e.message) + '</p>';
    } finally {
      charge = false;
    }
  };

  // Vérifie directement la session au chargement du script, sans dépendre
  // du timing d'exécution d'admin.js.
  (async function () {
    if (typeof DB === "undefined" || !DB) return;
    const { data } = await DB.auth.getSession();
    if (data && data.session) window.chargerDashboard();
  })();
})();

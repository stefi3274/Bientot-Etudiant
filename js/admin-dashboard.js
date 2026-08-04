/* ============================================================
   Admin — Tableau de bord : vue d'ensemble complète.
   Élèves, leçons, quiz, tentatives, score moyen, contributions
   en attente, répartition par filière, activité récente.
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
    if (charge) return; // évite les rechargements multiples au clic répété
    charge = true;

    const cartes = $("dbCartes"), filieresBox = $("dbFilieres"), activiteBox = $("dbActivite"), msg = $("dbMsg");
    if (!cartes) { charge = false; return; }

    try {
      const [
        { count: nbEleves },
        { count: nbLecons },
        { count: nbQuiz },
        { count: nbTentatives },
        { count: nbContribAttente },
        { data: eleves },
        { data: lecons },
        { data: quizList },
        { data: tentatives }
      ] = await Promise.all([
        DB.from("eleves").select("id", { count: "exact", head: true }),
        DB.from("lecons").select("id", { count: "exact", head: true }).eq("publie", true),
        DB.from("quiz").select("id", { count: "exact", head: true }).eq("publie", true),
        DB.from("tentatives").select("id", { count: "exact", head: true }),
        DB.from("contributions").select("id", { count: "exact", head: true }).eq("statut", "a_verifier"),
        DB.from("eleves").select("filieres"),
        DB.from("lecons").select("filiere").eq("publie", true),
        DB.from("quiz").select("filiere").eq("publie", true),
        DB.from("tentatives").select("nom, score, total, filiere, matiere, created_at").order("created_at", { ascending: false }).limit(8)
      ]);

      // ---------- Cartes KPI ----------
      let scoreMoyen = "—";
      if (tentatives && tentatives.length) {
        // score moyen calculé sur l'échantillon récent affiché ; pour un vrai moyen global on interroge tout
      }
      const { data: toutesTentatives } = await DB.from("tentatives").select("score, total");
      if (toutesTentatives && toutesTentatives.length) {
        const pct = toutesTentatives.reduce((acc, t) => acc + (t.total ? t.score / t.total : 0), 0) / toutesTentatives.length;
        scoreMoyen = Math.round(pct * 100) + "%";
      }

      cartes.innerHTML = [
        ["Élèves inscrits", nbEleves || 0],
        ["Leçons publiées", nbLecons || 0],
        ["Quiz publiés", nbQuiz || 0],
        ["Quiz passés", nbTentatives || 0],
        ["Score moyen", scoreMoyen],
        ["Contributions à vérifier", nbContribAttente || 0]
      ].map(([label, val]) =>
        '<div class="db-carte"><div class="db-n">' + esc(String(val)) + '</div><div class="db-l">' + esc(label) + '</div></div>'
      ).join("");

      if ((nbContribAttente || 0) > 0) {
        msg.textContent = nbContribAttente + " contribution(s) en attente de vérification.";
        msg.className = "status-msg on";
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
          + '<span class="db-fil-chiffres">' + c.eleves + ' élèves · ' + c.lecons + ' leçons · ' + c.quiz + ' quiz</span>'
          + '</div>';
      }).join("");

      // ---------- Activité récente ----------
      if (!tentatives || !tentatives.length) {
        activiteBox.innerHTML = '<p class="empty">Aucune tentative de quiz enregistrée pour le moment.</p>';
      } else {
        activiteBox.innerHTML = tentatives.map(t => {
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
      cartes.innerHTML = '<p class="empty">Erreur de chargement du tableau de bord.</p>';
    } finally {
      charge = false;
    }
  };

  // Si le panneau admin est déjà visible au chargement du script (session déjà active), on charge tout de suite
  document.addEventListener("DOMContentLoaded", () => {
    const panel = $("panel");
    if (panel && panel.style.display === "block" && window.DB) window.chargerDashboard();
  });
})();

/* Page de lecture d'une leçon */
(function () {
  const zone = document.getElementById("lectureZone");
  if (!zone) return;
  const id = new URLSearchParams(location.search).get("id");
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const filiereNoms = {
    f1: "Médecine, Agronomie & Vétérinaire",
    f2: "Sciences administratives, Économie & Génie",
    f3: "Sciences humaines et sociales"
  };

  if (!id) { zone.innerHTML = '<p style="text-align:center">Leçon introuvable.</p>'; return; }

  (async function () {
    if (typeof DB === "undefined" || !DB) { zone.innerHTML = '<p style="text-align:center">Lecture indisponible.</p>'; return; }
    const { data: l, error } = await DB.from("lecons").select("*").eq("id", id).eq("publie", true).maybeSingle();
    if (error || !l) { zone.innerHTML = '<p style="text-align:center">Cette leçon n\'existe pas ou n\'est plus disponible.</p>'; return; }

    document.title = l.titre + " · Bientôt Étudiant";
    if (l.filiere) document.body.setAttribute("data-filiere", l.filiere);
    const bread = document.getElementById("lhBread");
    if (bread) bread.textContent = l.titre;

    const retour = 'matiere.html?f=' + l.filiere + '&m=' + encodeURIComponent(l.matiere);

    zone.innerHTML =
      '<div class="lecture-head">'
      + '<span class="lh-num">' + esc(l.matiere) + ' · Leçon ' + (l.ordre || 1) + '</span>'
      + '<h1>' + esc(l.titre) + '</h1>'
      + '<div class="lh-meta">' + esc(filiereNoms[l.filiere] || "")
      + (l.auteur ? ' · par ' + esc(l.auteur) : '') + '</div>'
      + '</div>'
      + '<div class="lecture-corps">' + (l.contenu || '<p>(Contenu à venir.)</p>') + '</div>'
      + (l.pdf_url
          ? '<div class="lecture-pdf"><b>📄 ' + esc(l.pdf_nom || "Document PDF") + '</b>'
            + '<a class="btn btn-dark" href="' + esc(l.pdf_url) + '" target="_blank" rel="noopener" download>Télécharger le PDF <span>→</span></a></div>'
          : '')
      + '<div class="lecture-nav"><a class="btn btn-ghost" style="color:var(--encre);border-color:var(--craie-2)" href="' + retour + '">← Toutes les leçons de ' + esc(l.matiere) + '</a></div>';
  })();
})();

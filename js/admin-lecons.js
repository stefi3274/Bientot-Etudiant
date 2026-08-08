/* ============================================================
   Admin — gestion des leçons (éditeur riche + PDF)
   Se greffe sur l'admin existant (contributions).
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  const BUCKET = "Images";
  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français", "Botanique"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale", "Économie et Gestion"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques", "Droit"]
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  // ---------- Onglets admin (gère les 3 : contrib, lecons, quiz) ----------
  document.querySelectorAll(".adm-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const t = tab.getAttribute("data-tab");
      document.querySelectorAll(".adm-tab").forEach(x => x.classList.toggle("on", x === tab));
      ["dashboard", "contrib", "lecons", "quiz", "carousels", "fiche"].forEach(k => {
        const el = $("tab-" + k);
        if (el) el.style.display = (t === k) ? "block" : "none";
      });
      if (t === "lecons" && typeof DB !== "undefined" && DB) chargerLecons();
      if (t === "dashboard" && typeof DB !== "undefined" && DB && window.chargerDashboard) window.chargerDashboard();
    });
  });

  // ---------- Matières selon la filière (indépendant de Supabase) ----------
  const selFil = $("leFiliere"), selMat = $("leMatiere");
  function majMatieres() {
    if (!selFil || !selMat) return;
    const opts = MATIERES[selFil.value] || [];
    selMat.innerHTML = opts.map(m => '<option>' + esc(m) + '</option>').join("");
  }
  if (selFil) { selFil.addEventListener("change", majMatieres); majMatieres(); }

  if (typeof DB === "undefined" || !DB) return;

  // ---------- Éditeur riche ----------
  const rte = $("leContenu");
  const toolbar = $("rteToolbar");

  // Filet de sécurité : si on colle directement dans l'éditeur un texte contenant
  // des marqueurs ===FICHE:...===, on le convertit quand même en cartes au lieu
  // de laisser passer le texte brut tel quel.
  if (rte) {
    rte.addEventListener("paste", e => {
      const texte = (e.clipboardData || window.clipboardData).getData("text/plain");
      if (!texte || !/===\s*FICHE\s*:?/i.test(texte)) return; // collage normal, on laisse faire
      const resultat = fichesVersCarouselHtml(texte);
      if (!resultat) return;
      e.preventDefault();
      document.execCommand("insertHTML", false, resultat.html);
      const avertissement = resultat.quizIgnore
        ? " ⚠️ Un bloc ===QUIZ=== a été détecté et IGNORÉ (cet onglet ne crée pas de quiz)."
        : "";
      statusL(resultat.nbFiches + " fiche(s) détectée(s) et converties automatiquement en cartes." + avertissement, resultat.quizIgnore ? "err" : "ok");
    });
  }

  // ---------- Import "en fiches" (texte structuré -> HTML en cartes) ----------
  if ($("leVoirFormat")) $("leVoirFormat").addEventListener("click", e => {
    e.preventDefault();
    const ex = $("leExempleFormat");
    ex.style.display = ex.style.display === "none" ? "block" : "none";
  });

  function texteVersHtmlSimple(txt) {
    const paragraphes = txt.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return paragraphes.map(p => {
      const lignes = p.split("\n").map(l => l.trim()).filter(Boolean);
      if (lignes.length && lignes.every(l => /^[-*]\s+/.test(l))) {
        return "<ul>" + lignes.map(l => "<li>" + esc(l.replace(/^[-*]\s+/, "")) + "</li>").join("") + "</ul>";
      }
      return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
  }

  // Extrait les fiches (marqueurs ===FICHE:...===) d'un texte et produit le HTML carousel.
  // Indépendant de TITRE:/APERCU: — utilisable aussi bien pour l'import complet que pour
  // un simple collage direct dans l'éditeur. Si un bloc ===QUIZ=== traîne dans le texte
  // (l'onglet Leçons ne crée pas de quiz), il est ignoré et jamais mélangé à une fiche.
  function fichesVersCarouselHtml(texte) {
    const idxQuiz = texte.search(/^\s*===\s*QUIZ\s*===\s*$/im);
    const quizDetecte = idxQuiz >= 0;
    const texteUtile = quizDetecte ? texte.slice(0, idxQuiz) : texte;

    const regexFiches = /^\s*===\s*FICHE\s*:?\s*([^\n=]*?)\s*===\s*$/gim;
    const matches = [...texteUtile.matchAll(regexFiches)];
    if (!matches.length) return null;

    const fiches = [];
    for (let i = 0; i < matches.length; i++) {
      const debut = matches[i].index + matches[i][0].length;
      const fin = (i + 1 < matches.length) ? matches[i + 1].index : texteUtile.length;
      const contenuBrut = texteUtile.slice(debut, fin).trim();
      if (!contenuBrut) continue;
      fiches.push({ titre: matches[i][1].trim() || ("Fiche " + (fiches.length + 1)), contenu: contenuBrut });
    }
    if (!fiches.length) return null;

    const cartes = fiches.map((f, i) =>
      '<div class="fiche"><span class="fiche-num">' + (i + 1) + ' / ' + fiches.length + '</span>'
      + '<h3>' + esc(f.titre) + '</h3>'
      + texteVersHtmlSimple(f.contenu)
      + '</div>'
    ).join("\n");
    return {
      html: '<p class="fiches-hint">👉 Fais glisser pour voir toutes les fiches</p><div class="fiches-carousel">' + cartes + '</div>',
      nbFiches: fiches.length,
      quizIgnore: quizDetecte
    };
  }

  // Ajoute automatiquement une fiche couverture (titre+aperçu) et une fiche de fin
  // (invitation à rejoindre la communauté / faire le quiz) autour des fiches de contenu.
  function ajouterCouvertureEtFin(html, nbFiches, titre, apercu) {
    const total = nbFiches + 2;
    const couverture = '<div class="fiche fiche-couverture"><span class="fiche-num">1 / ' + total + '</span>'
      + '<h3>' + esc(titre) + '</h3>'
      + (apercu ? '<p>' + esc(apercu) + '</p>' : '')
      + '</div>';
    const fin = '<div class="fiche fiche-fin"><span class="fiche-num">' + total + ' / ' + total + '</span>'
      + '<h3>Rejoins la communauté !</h3>'
      + '<p>Crée un compte gratuit pour suivre ta progression et garder ta série de révision.</p>'
      + '<p>Et maintenant... à toi de jouer : fais le quiz de cette leçon pour vérifier ce que tu as retenu 👇</p>'
      + '</div>';
    // On réinjecte dans le carousel déjà généré, avant la première fiche et après la dernière
    return html.replace('<div class="fiches-carousel">', '<div class="fiches-carousel">' + couverture)
               .replace(/<\/div>\s*$/, fin + '</div>');
  }

  function parseLeconEnFiches(texte) {
    const marqueur = /^\s*===\s*FICHE\s*:?\s*([^\n=]*?)\s*===\s*$/im;
    const avant = texte.split(marqueur)[0];
    const titreMatch = avant.match(/^TITRE\s*:\s*(.+)$/im);
    const apercuMatch = avant.match(/^APERCU\s*:\s*(.+)$/im);
    if (!titreMatch) throw new Error("Ligne TITRE: manquante.");

    const resultat = fichesVersCarouselHtml(texte);
    if (!resultat) throw new Error('Aucune fiche trouvée (marqueur "===FICHE: Titre===" manquant).');

    const titre = titreMatch[1].trim();
    const apercu = apercuMatch ? apercuMatch[1].trim() : "";

    return {
      titre,
      apercu,
      html: ajouterCouvertureEtFin(resultat.html, resultat.nbFiches, titre, apercu),
      nbFiches: resultat.nbFiches,
      quizIgnore: resultat.quizIgnore
    };
  }

  if ($("leImporterFiches")) $("leImporterFiches").addEventListener("click", () => {
    const txt = ($("leTexteImport").value || "").trim();
    if (!txt) { statusL("Colle d'abord ta leçon en fiches.", "err"); return; }
    let resultat;
    try {
      resultat = parseLeconEnFiches(txt);
    } catch (e) {
      statusL("Erreur de format : " + e.message, "err");
      return;
    }
    $("leTitre").value = resultat.titre;
    $("leApercu").value = resultat.apercu;
    rte.innerHTML = resultat.html;
    const avertissement = resultat.quizIgnore
      ? " ⚠️ Un bloc ===QUIZ=== a été détecté et IGNORÉ ici (cet onglet ne crée pas de quiz). Utilise l'onglet Fiche pour leçon + quiz ensemble, ou l'onglet Quiz séparément."
      : "";
    statusL(resultat.nbFiches + " fiche(s) importée(s) + couverture et fin ajoutées (" + (resultat.nbFiches + 2) + " au total). Vérifie, puis publie normalement." + avertissement, resultat.quizIgnore ? "err" : "ok");
    $("leTexteImport").value = "";
  });

  if (toolbar && rte) {
    toolbar.querySelectorAll("button").forEach(b => {
      b.addEventListener("mousedown", e => e.preventDefault()); // garder le focus
      b.addEventListener("click", () => {
        if (b.hasAttribute("data-img")) { $("leImgInput").click(); return; }
        const cmd = b.getAttribute("data-cmd");
        const val = b.getAttribute("data-val") || null;
        rte.focus();
        document.execCommand(cmd, false, val);
      });
    });
  }

  // Image dans l'éditeur → upload puis insertion
  const imgInput = $("leImgInput");
  if (imgInput) {
    imgInput.addEventListener("change", async function () {
      const f = this.files[0]; if (!f) return;
      if (f.size > 4 * 1024 * 1024) { statusL("Image trop lourde (max 4 Mo).", "err"); return; }
      statusL("Envoi de l'image…", "");
      const ent = await monEnt(); if (!ent) return;
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const chemin = "bientot/lecons/img/" + Date.now() + "." + ext;
      const up = await DB.storage.from(BUCKET).upload(chemin, f);
      if (up.error) { statusL("Échec image : " + up.error.message, "err"); return; }
      const { data: pub } = DB.storage.from(BUCKET).getPublicUrl(chemin);
      rte.focus();
      document.execCommand("insertHTML", false, '<img src="' + pub.publicUrl + '" alt="">');
      statusL("Image insérée.", "ok");
      this.value = "";
    });
  }

  // ---------- PDF ----------
  let pdfFile = null;
  const pdfDrop = $("lePdfDrop"), pdfInput = $("lePdfInput"), pdfTxt = $("lePdfTxt");
  if (pdfDrop) {
    pdfDrop.addEventListener("click", () => pdfInput.click());
    pdfInput.addEventListener("change", function () {
      const f = this.files[0];
      if (!f) { pdfFile = null; pdfTxt.textContent = "Clique pour joindre un PDF (facultatif)"; pdfDrop.classList.remove("has"); return; }
      if (f.size > 10 * 1024 * 1024) { statusL("PDF trop lourd (max 10 Mo).", "err"); this.value = ""; return; }
      pdfFile = f; pdfTxt.textContent = "✓ " + f.name; pdfDrop.classList.add("has");
    });
  }

  // ---------- Enregistrer / éditer ----------
  let editId = null;
  const statusL = (m, t) => { const el = $("leconMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t||"ok"); } };

  async function monEnt() {
    const { data: prof } = await DB.from("profils").select("entreprise_id").maybeSingle();
    return prof ? prof.entreprise_id : null;
  }

  if ($("leSave")) $("leSave").addEventListener("click", async () => {
    const titre = $("leTitre").value.trim();
    if (!titre) { statusL("Le titre est requis.", "err"); return; }
    statusL("Enregistrement…", "");
    const ent = await monEnt();
    if (!ent) { statusL("Entreprise introuvable.", "err"); return; }

    const champs = {
      entreprise_id: ent,
      filiere: selFil.value,
      matiere: selMat.value,
      titre: titre,
      apercu: $("leApercu").value.trim() || null,
      contenu: rte.innerHTML.trim() || null,
      auteur: $("leAuteur").value.trim() || null,
      publie: true
    };

    // PDF éventuel
    if (pdfFile) {
      const safe = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-50);
      const chemin = "bientot/lecons/pdf/" + Date.now() + "_" + safe;
      const up = await DB.storage.from(BUCKET).upload(chemin, pdfFile);
      if (up.error) { statusL("Échec du PDF : " + up.error.message, "err"); return; }
      const { data: pub } = DB.storage.from(BUCKET).getPublicUrl(chemin);
      champs.pdf_url = pub.publicUrl; champs.pdf_nom = pdfFile.name; champs.pdf_chemin = chemin;
    }

    let res;
    if (editId) {
      res = await DB.from("lecons").update(champs).eq("id", editId);
    } else {
      // ordre = nb de leçons existantes pour cette matière + 1
      const { count } = await DB.from("lecons").select("id", { count: "exact", head: true })
        .eq("filiere", champs.filiere).eq("matiere", champs.matiere);
      champs.ordre = (count || 0) + 1;
      res = await DB.from("lecons").insert(champs);
    }
    if (res.error) { statusL("Erreur : " + res.error.message, "err"); return; }
    statusL(editId ? "Leçon modifiée." : "Leçon publiée !", "ok");
    resetForm();
    chargerLecons();
  });

  if ($("leCancel")) $("leCancel").addEventListener("click", resetForm);

  function resetForm() {
    editId = null; pdfFile = null;
    $("leTitre").value = ""; $("leApercu").value = ""; $("leAuteur").value = "";
    rte.innerHTML = "";
    pdfTxt.textContent = "Clique pour joindre un PDF (facultatif)";
    pdfDrop.classList.remove("has");
    $("leconFormTitre").textContent = "Nouvelle leçon";
    $("leSave").innerHTML = 'Publier la leçon <span>→</span>';
    $("leCancel").style.display = "none";
  }

  // ---------- Liste des leçons ----------
  let filtreLecon = "all";
  let derniereListe = [];
  document.querySelectorAll("#leconFilters .filter").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#leconFilters .filter").forEach(x => x.classList.toggle("on", x === b));
      filtreLecon = b.getAttribute("data-lf");
      chargerLecons();
    });
  });

  const normaliser = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if ($("leconRecherche")) $("leconRecherche").addEventListener("input", function () {
    afficherListeLecons(derniereListe, this.value);
  });

  function afficherListeLecons(data, recherche) {
    const box = $("leconList");
    let liste = data;
    if (recherche && recherche.trim()) {
      const r = normaliser(recherche.trim());
      liste = data.filter(l => normaliser(l.titre).includes(r) || normaliser(l.matiere).includes(r));
    }
    if (!liste.length) {
      box.innerHTML = "<p class='empty'>" + (recherche ? "Aucune leçon ne correspond à \"" + esc(recherche) + "\"." : "Aucune leçon pour l'instant.") + "</p>";
      return;
    }
    box.innerHTML = (recherche ? '<p style="color:var(--encre-2);font-size:.85rem;margin-bottom:10px">' + liste.length + ' résultat(s)</p>' : '')
      + liste.map(l =>
        '<div class="lec-item ' + l.filiere + '">'
        + '<div class="lec-info"><b>' + esc(l.titre) + '</b>'
        + '<span class="lec-meta">' + esc(l.matiere) + ' · Leçon ' + (l.ordre || 1)
        + (l.pdf_url ? ' · PDF joint' : '') + (l.auteur ? ' · ' + esc(l.auteur) : '') + '</span></div>'
        + '<div class="lec-act">'
        + '<button data-edit="' + l.id + '">Modifier</button>'
        + '<button class="del" data-del="' + l.id + '">Supprimer</button>'
        + '</div></div>'
      ).join("");

    box.querySelectorAll("[data-edit]").forEach(b =>
      b.onclick = () => editLecon(derniereListe.find(x => x.id === b.getAttribute("data-edit"))));
    box.querySelectorAll("[data-del]").forEach(b =>
      b.onclick = () => delLecon(b.getAttribute("data-del")));
  }

  async function chargerLecons() {
    const box = $("leconList");
    if (!box) return;
    box.innerHTML = "<p class='empty'>Chargement…</p>";
    let q = DB.from("lecons").select("*").order("filiere").order("matiere").order("ordre");
    if (filtreLecon !== "all") q = q.eq("filiere", filtreLecon);
    const { data, error } = await q;
    if (error) { box.innerHTML = "<p class='empty'>Erreur de chargement.</p>"; return; }
    derniereListe = data || [];
    afficherListeLecons(derniereListe, $("leconRecherche") ? $("leconRecherche").value : "");
  }

  function editLecon(l) {
    if (!l) return;
    editId = l.id;
    selFil.value = l.filiere; majMatieres(); selMat.value = l.matiere;
    $("leTitre").value = l.titre || "";
    $("leApercu").value = l.apercu || "";
    rte.innerHTML = l.contenu || "";
    $("leAuteur").value = l.auteur || "";
    pdfFile = null;
    pdfTxt.textContent = l.pdf_nom ? "PDF actuel : " + l.pdf_nom + " (choisis-en un autre pour remplacer)" : "Clique pour joindre un PDF (facultatif)";
    $("leconFormTitre").textContent = "Modifier la leçon";
    $("leSave").innerHTML = 'Enregistrer <span>→</span>';
    $("leCancel").style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function delLecon(id) {
    if (!confirm("Supprimer cette leçon ? Le quiz qui lui est lié (et ses questions) sera aussi supprimé.")) return;
    const { data: l } = await DB.from("lecons").select("pdf_chemin").eq("id", id).maybeSingle();
    if (l && l.pdf_chemin) await DB.storage.from(BUCKET).remove([l.pdf_chemin]);

    // Retirer d'abord le(s) quiz lié(s) à cette leçon (sinon la contrainte de clé étrangère bloque la suppression)
    const { data: quizLies } = await DB.from("quiz").select("id").eq("lecon_id", id);
    if (quizLies && quizLies.length) {
      const idsQuiz = quizLies.map(q => q.id);
      await DB.from("questions").delete().in("quiz_id", idsQuiz);
      await DB.from("quiz").delete().in("id", idsQuiz);
    }

    const { error } = await DB.from("lecons").delete().eq("id", id);
    if (error) statusL("Erreur : " + error.message, "err");
    else { if (editId === id) resetForm(); chargerLecons(); statusL("Leçon (et son quiz) supprimée.", "ok"); }
  }
})();

/* ============================================================
   Admin — gestion des leçons (éditeur riche + PDF)
   Se greffe sur l'admin existant (contributions).
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  const BUCKET = "Images";
  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques"]
  };
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  // ---------- Onglets admin (gère les 3 : contrib, lecons, quiz) ----------
  document.querySelectorAll(".adm-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const t = tab.getAttribute("data-tab");
      document.querySelectorAll(".adm-tab").forEach(x => x.classList.toggle("on", x === tab));
      ["contrib", "lecons", "quiz"].forEach(k => {
        const el = $("tab-" + k);
        if (el) el.style.display = (t === k) ? "block" : "none";
      });
      if (t === "lecons" && window.DB) chargerLecons();
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
  document.querySelectorAll("#leconFilters .filter").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#leconFilters .filter").forEach(x => x.classList.toggle("on", x === b));
      filtreLecon = b.getAttribute("data-lf");
      chargerLecons();
    });
  });

  async function chargerLecons() {
    const box = $("leconList");
    if (!box) return;
    box.innerHTML = "<p class='empty'>Chargement…</p>";
    let q = DB.from("lecons").select("*").order("filiere").order("matiere").order("ordre");
    if (filtreLecon !== "all") q = q.eq("filiere", filtreLecon);
    const { data, error } = await q;
    if (error) { box.innerHTML = "<p class='empty'>Erreur de chargement.</p>"; return; }
    if (!data.length) { box.innerHTML = "<p class='empty'>Aucune leçon pour l'instant.</p>"; return; }

    box.innerHTML = data.map(l =>
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
      b.onclick = () => editLecon(data.find(x => x.id === b.getAttribute("data-edit"))));
    box.querySelectorAll("[data-del]").forEach(b =>
      b.onclick = () => delLecon(b.getAttribute("data-del")));
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
    if (!confirm("Supprimer cette leçon ?")) return;
    const { data: l } = await DB.from("lecons").select("pdf_chemin").eq("id", id).maybeSingle();
    if (l && l.pdf_chemin) await DB.storage.from(BUCKET).remove([l.pdf_chemin]);
    const { error } = await DB.from("lecons").delete().eq("id", id);
    if (error) statusL("Erreur : " + error.message, "err");
    else { if (editId === id) resetForm(); chargerLecons(); }
  }
})();

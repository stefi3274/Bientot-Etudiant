/* Contribution — upload fichier vers Supabase Storage + enregistrement */
(function () {
  const form = document.getElementById("contribForm");
  if (!form) return;
  const BUCKET = "Images";
  const msg = document.getElementById("contribMsg");
  const drop = document.getElementById("fileDrop");
  const input = document.getElementById("ctFichier");
  const fdName = document.getElementById("fdName");
  const show = (m, t) => { msg.textContent = m; msg.className = "form-msg on " + t; };

  let fichier = null;
  const MAX = 10 * 1024 * 1024; // 10 Mo
  const OK_EXT = ["doc", "docx", "odt", "pdf"];

  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", function () {
    const f = this.files[0];
    if (!f) { fichier = null; fdName.textContent = ""; return; }
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!OK_EXT.includes(ext)) { show("Format non accepté. Utilise Word, ODT ou PDF.", "err"); this.value = ""; return; }
    if (f.size > MAX) { show("Fichier trop lourd (max 10 Mo).", "err"); this.value = ""; return; }
    fichier = f;
    fdName.textContent = "✓ " + f.name;
    msg.className = "form-msg";
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("ctSubmit");

    const auteur = form.auteur.value.trim();
    const contact = form.contact.value.trim();
    const sources = form.sources.value.trim();
    if (!auteur || !contact || !sources) { show("Merci de remplir les champs obligatoires.", "err"); return; }
    if (!fichier) { show("Merci de joindre ton fichier (Word, ODT ou PDF).", "err"); return; }
    if (!DB) { show("Envoi indisponible pour le moment. Réessaie plus tard.", "err"); return; }

    btn.disabled = true;
    show("Envoi en cours… (cela peut prendre un moment)", "");

    const ent = await entrepriseId();
    if (!ent) { show("Une erreur est survenue.", "err"); btn.disabled = false; return; }

    // 1) Upload du fichier
    const ext = (fichier.name.split(".").pop() || "pdf").toLowerCase();
    const safe = fichier.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const chemin = "bientot/contributions/" + Date.now() + "_" + safe;
    const up = await DB.storage.from(BUCKET).upload(chemin, fichier);
    if (up.error) { show("Échec de l'envoi du fichier : " + up.error.message, "err"); btn.disabled = false; return; }
    const { data: pub } = DB.storage.from(BUCKET).getPublicUrl(chemin);

    // 2) Enregistrer la contribution
    const { error } = await DB.from("contributions").insert({
      entreprise_id: ent,
      auteur: auteur,
      contact: contact,
      filiere: form.filiere.value || null,
      matiere: form.matiere.value.trim() || null,
      type_contenu: form.type.value || null,
      message: form.message.value.trim() || null,
      sources: sources,
      fichier_url: pub.publicUrl,
      fichier_nom: fichier.name,
      fichier_chemin: chemin,
      statut: "a_verifier"
    });

    if (error) { show("Une erreur est survenue : " + error.message, "err"); btn.disabled = false; return; }

    show("Merci ! Ta contribution a bien été envoyée. Nous la vérifierons avant publication.", "ok");
    form.reset();
    fichier = null;
    fdName.textContent = "";
    btn.disabled = false;
  });
})();

/* Onglets + affichage des contributeurs validés */
(function () {
  const tabs = document.querySelectorAll(".tab");
  if (tabs.length) {
    tabs.forEach(t => t.addEventListener("click", () => {
      const name = t.getAttribute("data-tab");
      tabs.forEach(x => x.classList.toggle("on", x === t));
      document.querySelectorAll(".tab-pane").forEach(p =>
        p.classList.toggle("on", p.id === "pane-" + name));
      if (name === "contributeurs") chargerContributeurs();
    }));
  }

  let dejaCharge = false;
  async function chargerContributeurs() {
    if (dejaCharge) return;
    dejaCharge = true;
    const box = document.getElementById("ctrList");
    const esc = s => (s || "").replace(/[&<>"']/g, c => (
      { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

    if (!DB) { box.innerHTML = '<p class="ctr-vide">Liste indisponible pour le moment.</p>'; return; }
    const ent = await entrepriseId();
    if (!ent) { box.innerHTML = '<p class="ctr-vide">Liste indisponible pour le moment.</p>'; return; }

    const { data, error } = await DB.from("contributions")
      .select("auteur, filiere, matiere")
      .eq("entreprise_id", ent).eq("statut", "valide")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      box.innerHTML = '<p class="ctr-vide">Les premiers contributeurs apparaîtront ici bientôt. Sois le premier à contribuer !</p>';
      return;
    }

    // Dédupliquer par auteur (un contributeur peut avoir plusieurs contributions)
    const vus = new Map();
    data.forEach(c => {
      if (!vus.has(c.auteur)) vus.set(c.auteur, new Set());
      if (c.matiere) vus.get(c.auteur).add(c.matiere);
    });

    box.innerHTML = Array.from(vus.entries()).map(([auteur, matieres]) => {
      const initiale = (auteur.trim()[0] || "?").toUpperCase();
      const mats = Array.from(matieres);
      const sousTitre = mats.length ? mats.slice(0, 2).join(", ") : "Contributeur";
      return '<div class="ctr"><div class="av">' + esc(initiale) + '</div>'
        + '<div class="ci"><b>' + esc(auteur) + '</b><span>' + esc(sousTitre) + '</span></div></div>';
    }).join("");
  }
})();

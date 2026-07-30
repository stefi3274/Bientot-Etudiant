/* ============================================================
   Admin — génération auto d'une leçon + quiz depuis un texte collé
   Utilise /api/generer.js (Claude API côté serveur).
   Remplit les onglets Leçon et Quiz existants pour relecture avant publication.
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const MATIERES = {
    f1: ["Mathématiques", "Biologie", "Chimie", "Physique", "Français"],
    f2: ["Mathématiques", "Physique", "Chimie", "Français", "Culture générale"],
    f3: ["Français", "Créole", "Culture générale", "Philosophie", "Mathématiques"]
  };
  const statusG = (m, t) => { const el = $("geMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  const selFil = $("geFiliere"), selMat = $("geMatiere");
  function majMat() {
    if (!selFil || !selMat) return;
    selMat.innerHTML = (MATIERES[selFil.value] || []).map(m => "<option>" + m + "</option>").join("");
  }
  if (selFil) { selFil.addEventListener("change", majMat); majMat(); }

  let dernierResultat = null;
  let fichierChoisi = null;

  const geDrop = $("geFichierDrop"), geInput = $("geFichierInput"), geTxtLabel = $("geFichierTxt");
  if (geDrop) {
    geDrop.addEventListener("click", () => geInput.click());
    geInput.addEventListener("change", function () {
      const f = this.files[0];
      if (!f) { fichierChoisi = null; geTxtLabel.textContent = "Clique pour choisir un fichier"; geDrop.classList.remove("has"); return; }
      if (f.size > 3 * 1024 * 1024) {
        statusG("Fichier trop lourd (max 3 Mo). Convertis-le ou colle le texte directement.", "err");
        this.value = ""; fichierChoisi = null;
        return;
      }
      fichierChoisi = f;
      geTxtLabel.textContent = "✓ " + f.name;
      geDrop.classList.add("has");
    });
  }

  function lireFichierEnBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  if ($("geGenerer")) $("geGenerer").addEventListener("click", async () => {
    const texte = ($("geTexte").value || "").trim();
    if (!fichierChoisi && texte.length < 80) { statusG("Choisis un fichier ou colle un texte plus long (minimum ~80 caractères).", "err"); return; }

    statusG("Génération en cours… (peut prendre 10-20 secondes)", "");
    $("geGenerer").disabled = true;
    if ($("geAppliquer")) $("geAppliquer").style.display = "none";
    $("geApercuZone").style.display = "none";

    try {
      const payload = { filiere: selFil.value, matiere: selMat.value };
      if (fichierChoisi) {
        payload.fichier_base64 = await lireFichierEnBase64(fichierChoisi);
        payload.fichier_nom = fichierChoisi.name;
      } else {
        payload.texte = texte;
      }

      const r = await fetch("/api/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) { statusG("Erreur : " + (data.error || "génération impossible."), "err"); return; }

      dernierResultat = data;
      $("geApercuTitre").textContent = data.titre || "";
      $("geApercuTexte").textContent = data.apercu || "";
      $("geApercuNbQ").textContent = (data.questions || []).length + " questions générées";
      $("geApercuZone").style.display = "block";
      if ($("geAppliquer")) $("geAppliquer").style.display = "inline-flex";
      statusG("Génération terminée. Vérifie l'aperçu ci-dessous.", "ok");
    } catch (e) {
      statusG("Erreur réseau : " + e.message, "err");
    } finally {
      $("geGenerer").disabled = false;
    }
  });

  if ($("geAppliquer")) $("geAppliquer").addEventListener("click", () => {
    if (!dernierResultat) return;

    // Remplit l'onglet Leçon
    const leFil = $("leFiliere"), leMat = $("leMatiere");
    leFil.value = selFil.value;
    leFil.dispatchEvent(new Event("change"));
    setTimeout(() => { leMat.value = selMat.value; }, 0);
    $("leTitre").value = dernierResultat.titre || "";
    $("leApercu").value = dernierResultat.apercu || "";
    $("leContenu").innerHTML = dernierResultat.contenu_html || "";

    // Remplit l'onglet Quiz
    const qzFil = $("qzFiliere"), qzMat = $("qzMatiere");
    qzFil.value = selFil.value;
    qzFil.dispatchEvent(new Event("change"));
    setTimeout(() => { qzMat.value = selMat.value; }, 0);
    $("qzTitre").value = "Quiz — " + (dernierResultat.titre || "");
    if (window.BQ_remplirQuestions) window.BQ_remplirQuestions(dernierResultat.questions || []);

    statusG("Champs remplis dans les onglets Leçon et Quiz. Relis, corrige si besoin, puis publie normalement.", "ok");

    // Bascule vers l'onglet Leçon pour relecture immédiate
    const tabLecons = document.querySelector('.adm-tab[data-tab="lecons"]');
    if (tabLecons) tabLecons.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

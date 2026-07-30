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
  const esc = s => (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

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

      dernierResultat = data.lecons || [];
      afficherApercu();
      statusG("Génération terminée (" + dernierResultat.length + " leçon" + (dernierResultat.length > 1 ? "s" : "") + "). Vérifie l'aperçu ci-dessous.", "ok");
    } catch (e) {
      statusG("Erreur réseau : " + e.message, "err");
    } finally {
      $("geGenerer").disabled = false;
    }
  });

  function afficherApercu() {
    const zone = $("geApercuZone");
    const bouton = $("geAppliquer");
    if (!dernierResultat || !dernierResultat.length) { zone.style.display = "none"; return; }

    if (dernierResultat.length === 1) {
      const d = dernierResultat[0];
      $("geApercuListe").innerHTML =
        '<p style="margin-bottom:4px"><b>' + esc(d.titre) + '</b></p>'
        + '<p style="color:var(--encre-2);font-size:.9rem;margin-bottom:6px">' + esc(d.apercu || "") + '</p>'
        + '<p style="color:var(--encre-2);font-size:.85rem">' + (d.questions || []).length + ' questions générées</p>';
      bouton.textContent = "Appliquer aux onglets Leçon/Quiz →";
    } else {
      $("geApercuListe").innerHTML =
        '<ol style="padding-left:18px;color:var(--encre)">'
        + dernierResultat.map(d =>
            '<li style="margin-bottom:8px"><b>' + esc(d.titre) + '</b><br>'
            + '<span style="color:var(--encre-2);font-size:.88rem">' + esc(d.apercu || "") + ' · ' + (d.questions || []).length + ' questions</span></li>'
          ).join("")
        + '</ol>';
      bouton.textContent = "Publier les " + dernierResultat.length + " leçons + quiz →";
    }
    zone.style.display = "block";
    bouton.style.display = "inline-flex";
  }

  async function monEnt() {
    const { data: prof } = await DB.from("profils").select("entreprise_id").maybeSingle();
    return prof ? prof.entreprise_id : null;
  }

  if ($("geAppliquer")) $("geAppliquer").addEventListener("click", async () => {
    if (!dernierResultat || !dernierResultat.length) return;

    if (dernierResultat.length === 1) {
      // Flux existant : remplit les onglets pour relecture avant publication manuelle
      const d = dernierResultat[0];
      const leFil = $("leFiliere"), leMat = $("leMatiere");
      leFil.value = selFil.value;
      leFil.dispatchEvent(new Event("change"));
      setTimeout(() => { leMat.value = selMat.value; }, 0);
      $("leTitre").value = d.titre || "";
      $("leApercu").value = d.apercu || "";
      $("leContenu").innerHTML = d.contenu_html || "";

      const qzFil = $("qzFiliere"), qzMat = $("qzMatiere");
      qzFil.value = selFil.value;
      qzFil.dispatchEvent(new Event("change"));
      setTimeout(() => { qzMat.value = selMat.value; }, 0);
      $("qzTitre").value = "Quiz — " + (d.titre || "");
      if (window.BQ_remplirQuestions) window.BQ_remplirQuestions(d.questions || []);

      statusG("Champs remplis dans les onglets Leçon et Quiz. Relis, corrige si besoin, puis publie normalement.", "ok");
      const tabLecons = document.querySelector('.adm-tab[data-tab="lecons"]');
      if (tabLecons) tabLecons.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Plusieurs leçons : publication directe en base
    if (typeof DB === "undefined" || !DB) { statusG("Connexion Supabase indisponible.", "err"); return; }
    if (!confirm("Publier directement les " + dernierResultat.length + " leçons et leurs quiz ?")) return;

    $("geAppliquer").disabled = true;
    statusG("Publication en cours…", "");
    const ent = await monEnt();
    if (!ent) { statusG("Entreprise introuvable.", "err"); $("geAppliquer").disabled = false; return; }

    const { count } = await DB.from("lecons").select("id", { count: "exact", head: true })
      .eq("filiere", selFil.value).eq("matiere", selMat.value);
    let ordre = (count || 0) + 1;

    let ok = 0, erreurs = [];
    for (const d of dernierResultat) {
      const champs = {
        entreprise_id: ent, filiere: selFil.value, matiere: selMat.value,
        titre: d.titre, apercu: d.apercu || null, contenu: d.contenu_html || null,
        publie: true, ordre: ordre
      };
      const { data: lec, error: eLec } = await DB.from("lecons").insert(champs).select("id").single();
      if (eLec) { erreurs.push(d.titre + " : " + eLec.message); continue; }
      ordre++;

      const { data: qz, error: eQz } = await DB.from("quiz").insert({
        entreprise_id: ent, filiere: selFil.value, matiere: selMat.value,
        titre: "Quiz — " + d.titre, duree_sec: 600, type: "lecon", lecon_id: lec.id, publie: true
      }).select("id").single();
      if (eQz) { erreurs.push(d.titre + " (quiz) : " + eQz.message); continue; }

      const rows = (d.questions || []).map((q, i) => ({
        quiz_id: qz.id, ordre: i + 1, enonce: q.enonce,
        choix_a: q.choix_a, choix_b: q.choix_b, choix_c: q.choix_c, choix_d: q.choix_d, bonne: q.bonne
      }));
      const { error: eQ } = await DB.from("questions").insert(rows);
      if (eQ) { erreurs.push(d.titre + " (questions) : " + eQ.message); continue; }
      ok++;
    }

    $("geAppliquer").disabled = false;
    if (erreurs.length) statusG(ok + " leçon(s) publiée(s), " + erreurs.length + " erreur(s) : " + erreurs.join(" | "), "err");
    else statusG(ok + " leçons et quiz publiés avec succès !", "ok");
    dernierResultat = null;
    $("geApercuZone").style.display = "none";
    $("geTexte").value = "";
    fichierChoisi = null; geTxtLabel.textContent = "Clique pour choisir un fichier"; geDrop.classList.remove("has");
  });
})();

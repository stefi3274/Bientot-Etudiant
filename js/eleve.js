/* ============================================================
   Comptes élèves — inscription, connexion, session, profil
   ============================================================ */

const FILIERES = {
  f1: "Médecine, Agronomie & Vétérinaire",
  f2: "Sciences administratives, Économie & Génie",
  f3: "Sciences humaines et sociales"
};
const SERIES = { svt: "SVT", mp: "MP", ses: "SES", lla: "LLA" };
const MATIERES_PREFAC = MATIERES;
// NIVEAUX, NIVEAUX_AVEC_SERIE, MATIERES_9E_AF, TRONC_COMMUN, SERIES_MATIERES,
// MATIERE_CLASSES et classeMatiere() viennent maintenant de js/matieres-data.js
// (chargé avant ce fichier sur toutes les pages) : source unique.

// Récupère l'élève connecté (ou null)

async function eleveActuel() {
  if (!DB) return null;
  const { data: sess } = await DB.auth.getSession();
  if (!sess.session) return null;
  const { data } = await DB.from("eleves").select("*").eq("user_id", sess.session.user.id).maybeSingle();
  return data || { user_id: sess.session.user.id, nom: "", filieres: [] };
}

// Met à jour le petit menu "compte" dans l'en-tête de chaque page
async function majMenuCompte() {
  const zone = document.getElementById("compteZone");
  if (!zone) return;
  const el = await eleveActuel();
  if (el) {
    zone.innerHTML = '<a href="messagerie.html" style="margin-right:14px">Messages</a><a href="espace.html" class="cta">Mon espace</a>';
  } else {
    zone.innerHTML = '<a href="connexion.html" class="cta">Se connecter</a>';
    initInviteFlottante();
  }
}

// Invitation flottante en mouvement (invités uniquement) : glisse depuis le bas
// après quelques secondes, pour inviter à créer un compte sans être intrusive.
function initInviteFlottante() {
  const page = location.pathname.split("/").pop();
  const pagesExclues = ["connexion.html", "inscription.html", "admin.html", "quiz.html", "", "index.html"];
  if (pagesExclues.includes(page)) return;
  if (sessionStorage.getItem("invite_masquee")) return;
  if (document.getElementById("inviteFlottante")) return;

  setTimeout(() => {
    const div = document.createElement("div");
    div.id = "inviteFlottante";
    div.className = "invite-flottante";
    div.innerHTML =
      '<button class="invite-fermer" aria-label="Fermer">✕</button>'
      + '<span class="invite-emoji">🎓</span>'
      + '<div class="invite-txt"><b>Progresse plus vite !</b><span>Crée un compte gratuit pour suivre tes leçons et quiz.</span></div>'
      + '<a href="inscription.html" class="btn btn-dark" style="flex:0 0 auto">Créer un compte <span>→</span></a>';
    document.body.appendChild(div);
    requestAnimationFrame(() => div.classList.add("in"));

    div.querySelector(".invite-fermer").addEventListener("click", () => {
      div.classList.remove("in");
      sessionStorage.setItem("invite_masquee", "1");
      setTimeout(() => div.remove(), 400);
    });
  }, 4000);
}

/* ---------- INSCRIPTION ---------- */
function initInscription() {
  const form = document.getElementById("signupForm");
  if (!form) return;
  const msg = document.getElementById("signupMsg");
  const show = (m, t) => { msg.textContent = m; msg.className = "form-msg on " + t; };

  const checks = form.querySelectorAll('input[name="filiere"]');
  checks.forEach(c => c.addEventListener("change", () => {
    const cochees = Array.from(checks).filter(x => x.checked);
    if (cochees.length > 2) { c.checked = false; show("Tu peux choisir 2 filières maximum.", "err"); }
    else msg.className = "form-msg";
  }));

  const secWrap = document.getElementById("suSecWrap"), prefacWrap = document.getElementById("suPrefacWrap");
  const selNiveau = document.getElementById("suNiveau"), serieWrap = document.getElementById("suSerieWrap"), selSerie = document.getElementById("suSerie");
  const matieresBox = document.getElementById("suMatieresBox");

  function universActuel() {
    const r = form.querySelector('input[name="univers"]:checked');
    return r ? r.value : "sec";
  }

  function majMatieresPreferees() {
    const sec = universActuel() === "sec";
    let liste;
    if (sec) {
      liste = NIVEAUX_AVEC_SERIE.includes(selNiveau.value) ? (SERIES_MATIERES[selSerie.value] || []) : (selNiveau.value === "9e" ? MATIERES_9E_AF : TRONC_COMMUN);
    } else {
      const filChoisies = Array.from(checks).filter(x => x.checked).map(x => x.value);
      const ensemble = new Set();
      (filChoisies.length ? filChoisies : ["f1", "f2", "f3"]).forEach(f => (MATIERES_PREFAC[f] || []).forEach(m => ensemble.add(m)));
      liste = [...ensemble];
    }
    matieresBox.innerHTML = liste.map(m =>
      '<label class="fil-opt"><input type="checkbox" name="matiere-pref" value="' + m.replace(/"/g, "&quot;") + '"><span class="dot"></span><span>' + m + '</span></label>'
    ).join("");
  }

  function majUnivers() {
    const sec = universActuel() === "sec";
    secWrap.style.display = sec ? "block" : "none";
    prefacWrap.style.display = sec ? "none" : "block";
    majMatieresPreferees();
  }
  form.querySelectorAll('input[name="univers"]').forEach(r => r.addEventListener("change", majUnivers));
  selNiveau.addEventListener("change", () => {
    serieWrap.style.display = NIVEAUX_AVEC_SERIE.includes(selNiveau.value) ? "block" : "none";
    majMatieresPreferees();
  });
  selSerie.addEventListener("change", majMatieresPreferees);
  checks.forEach(c => c.addEventListener("change", majMatieresPreferees));
  majUnivers();

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nom = form.nom.value.trim();
    const email = form.email.value.trim();
    const pass = form.password.value;
    const estSec = universActuel() === "sec";
    const filieres = estSec ? [] : Array.from(checks).filter(x => x.checked).map(x => x.value);
    const niveau = estSec ? selNiveau.value : null;
    const serie = (estSec && NIVEAUX_AVEC_SERIE.includes(selNiveau.value)) ? selSerie.value : null;
    const matieresPreferees = Array.from(matieresBox.querySelectorAll('input[name="matiere-pref"]:checked')).map(x => x.value);
    const etablissement = document.getElementById("suEtablissement").value.trim();
    const ville = document.getElementById("suVille").value.trim();

    if (!nom || !email || !pass) { show("Merci de remplir tous les champs.", "err"); return; }
    if (pass.length < 6) { show("Le mot de passe doit faire au moins 6 caractères.", "err"); return; }
    if (!estSec && filieres.length === 0) { show("Choisis au moins une filière.", "err"); return; }
    if (!DB) { show("Inscription indisponible pour le moment.", "err"); return; }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    show("Création de ton compte…", "");

    // 1) Créer le compte Auth
    const { data: auth, error: authErr } = await DB.auth.signUp({ email, password: pass });
    if (authErr) {
      show(authErr.message.includes("already") ? "Cet email a déjà un compte. Connecte-toi." : "Erreur : " + authErr.message, "err");
      btn.disabled = false; return;
    }

    // 2) Créer le profil élève
    const ent = await entrepriseId();
    const { error: profErr } = await DB.from("eleves").insert({
      user_id: auth.user.id,
      entreprise_id: ent,
      nom: nom,
      filieres: filieres,
      niveau: niveau,
      serie: serie,
      matieres_preferees: matieresPreferees,
      etablissement: etablissement || null,
      ville: ville || null
    });
    if (profErr) { show("Compte créé, mais erreur de profil : " + profErr.message, "err"); btn.disabled = false; return; }

    show("Bienvenue " + nom.split(" ")[0] + " ! Ton compte est prêt.", "ok");
    setTimeout(() => location.href = "espace.html", 1200);
  });
}

/* ---------- CONNEXION ---------- */
function initConnexion() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const msg = document.getElementById("loginMsg");
  const show = (m, t) => { msg.textContent = m; msg.className = "form-msg on " + t; };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    const pass = form.password.value;
    if (!email || !pass) { show("Entre ton email et ton mot de passe.", "err"); return; }
    if (!DB) { show("Connexion indisponible pour le moment.", "err"); return; }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    show("Connexion…", "");

    const { error } = await DB.auth.signInWithPassword({ email, password: pass });
    if (error) { show("Email ou mot de passe incorrect.", "err"); btn.disabled = false; return; }
    show("Connecté ! Un instant…", "ok");
    setTimeout(() => location.href = "espace.html", 800);
  });
}

/* ---------- ESPACE ÉLÈVE ---------- */
async function initEspace() {
  const zone = document.getElementById("espaceContenu");
  if (!zone) return;

  const el = await eleveActuel();
  if (!el) { location.href = "connexion.html"; return; }

  // Nom
  const nomEl = document.getElementById("espaceNom");
  if (nomEl) nomEl.textContent = el.nom.split(" ")[0];

  // Résumé du profil (lecture seule, au-dessus du formulaire dépliable)
  const resumeZone = document.getElementById("monProfilResume");
  function afficherResume(d) {
    if (!resumeZone) return;
    const morceaux = [];
    if (d.niveau) {
      morceaux.push('<span class="fil-tag">' + (NIVEAUX[d.niveau] || d.niveau) + '</span>');
      if (d.serie) morceaux.push('<span class="fil-tag">' + (SERIES[d.serie] || d.serie) + '</span>');
    }
    if (d.filieres && d.filieres.length) d.filieres.forEach(f => morceaux.push('<span class="fil-tag ' + f + '">' + (FILIERES[f] || f) + '</span>'));
    if (d.matieres_preferees && d.matieres_preferees.length) morceaux.push('<span class="fil-tag">' + d.matieres_preferees.join(", ") + '</span>');
    if (d.etablissement) morceaux.push('<span class="fil-tag">' + d.etablissement + '</span>');
    if (d.ville) morceaux.push('<span class="fil-tag">' + d.ville + '</span>');
    resumeZone.innerHTML = morceaux.length ? '<div class="fil-tags">' + morceaux.join("") + '</div>' : '<p class="empty">Profil pas encore complété.</p>';
  }
  afficherResume(el);

  // ---------- Photo de profil ----------
  const avatarImg = document.getElementById("avatarImg");
  const avatarInitiale = document.getElementById("avatarInitiale");
  const avatarEditBtn = document.getElementById("avatarEditBtn");
  const avatarInput = document.getElementById("avatarInput");
  const avatarMsg = document.getElementById("avatarMsg");

  function afficherAvatar(url, nom) {
    if (url) {
      avatarImg.src = url + "?t=" + Date.now();
      avatarImg.style.display = "block";
      avatarInitiale.style.display = "none";
    } else {
      avatarImg.style.display = "none";
      avatarInitiale.style.display = "block";
      avatarInitiale.textContent = (nom || "?").trim().charAt(0).toUpperCase();
    }
  }
  afficherAvatar(el.photo_url, el.nom);

  if (avatarEditBtn && avatarInput) {
    avatarEditBtn.addEventListener("click", () => avatarInput.click());
    avatarInput.addEventListener("change", async () => {
      const fichier = avatarInput.files[0];
      if (!fichier) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(fichier.type)) {
        avatarMsg.textContent = "Format non supporté (PNG, JPG ou WEBP uniquement)."; avatarMsg.className = "status-msg on err"; return;
      }
      if (fichier.size > 3 * 1024 * 1024) {
        avatarMsg.textContent = "Image trop lourde (3 Mo maximum)."; avatarMsg.className = "status-msg on err"; return;
      }

      avatarEditBtn.disabled = true;
      avatarMsg.textContent = "Envoi en cours…"; avatarMsg.className = "status-msg on";

      const extension = fichier.name.split(".").pop().toLowerCase();
      const chemin = el.user_id + "/avatar." + extension;

      const { error: eUp } = await DB.storage.from("avatars").upload(chemin, fichier, { upsert: true });
      if (eUp) {
        avatarMsg.textContent = "Erreur lors de l'envoi : " + eUp.message; avatarMsg.className = "status-msg on err";
        avatarEditBtn.disabled = false; return;
      }
      const { data: pub } = DB.storage.from("avatars").getPublicUrl(chemin);
      const { error: eMaj } = await DB.from("eleves").update({ photo_url: pub.publicUrl, updated_at: new Date().toISOString() }).eq("user_id", el.user_id);
      if (eMaj) {
        avatarMsg.textContent = "Erreur d'enregistrement : " + eMaj.message; avatarMsg.className = "status-msg on err";
        avatarEditBtn.disabled = false; return;
      }

      el.photo_url = pub.publicUrl;
      afficherAvatar(pub.publicUrl, el.nom);
      avatarMsg.textContent = "Photo de profil mise à jour !"; avatarMsg.className = "status-msg on ok";
      avatarEditBtn.disabled = false;
    });
  }

  // ---------- Formulaire de modification du profil ----------
  const profilForm = document.getElementById("profilForm");
  if (profilForm) {
    const msg = document.getElementById("profilMsg");
    const secWrap = document.getElementById("pfSecWrap"), prefacWrap = document.getElementById("pfPrefacWrap");
    const selNiveau = document.getElementById("pfNiveau"), serieWrap = document.getElementById("pfSerieWrap"), selSerie = document.getElementById("pfSerie");
    const filChecks = profilForm.querySelectorAll('input[name="filiere"]');
    const matieresBox = document.getElementById("pfMatieresBox");
    const champEtablissement = document.getElementById("pfEtablissement"), champVille = document.getElementById("pfVille");

    function universActuel() {
      const r = profilForm.querySelector('input[name="univers"]:checked');
      return r ? r.value : "sec";
    }
    function majMatieresPreferees(dejaCochees) {
      const sec = universActuel() === "sec";
      let liste;
      if (sec) {
        liste = NIVEAUX_AVEC_SERIE.includes(selNiveau.value) ? (SERIES_MATIERES[selSerie.value] || []) : (selNiveau.value === "9e" ? MATIERES_9E_AF : TRONC_COMMUN);
      } else {
        const filChoisies = Array.from(filChecks).filter(x => x.checked).map(x => x.value);
        const ensemble = new Set();
        (filChoisies.length ? filChoisies : ["f1", "f2", "f3"]).forEach(f => (MATIERES_PREFAC[f] || []).forEach(m => ensemble.add(m)));
        liste = [...ensemble];
      }
      const dejaSet = new Set(dejaCochees || []);
      matieresBox.innerHTML = liste.map(m =>
        '<label class="fil-opt"><input type="checkbox" name="matiere-pref" value="' + m.replace(/"/g, "&quot;") + '"' + (dejaSet.has(m) ? " checked" : "") + '><span class="dot"></span><span>' + m + '</span></label>'
      ).join("");
    }
    function majUnivers(dejaCochees) {
      const sec = universActuel() === "sec";
      secWrap.style.display = sec ? "block" : "none";
      prefacWrap.style.display = sec ? "none" : "block";
      majMatieresPreferees(dejaCochees);
    }

    // Pré-remplir avec les valeurs actuelles
    const estSecActuel = !!el.niveau;
    profilForm.querySelector('input[name="univers"][value="' + (estSecActuel ? "sec" : "prefac") + '"]').checked = true;
    if (el.niveau) selNiveau.value = el.niveau;
    serieWrap.style.display = NIVEAUX_AVEC_SERIE.includes(selNiveau.value) ? "block" : "none";
    if (el.serie) selSerie.value = el.serie;
    filChecks.forEach(c => { c.checked = (el.filieres || []).includes(c.value); });
    if (champEtablissement) champEtablissement.value = el.etablissement || "";
    if (champVille) champVille.value = el.ville || "";
    majUnivers(el.matieres_preferees);

    profilForm.querySelectorAll('input[name="univers"]').forEach(r => r.addEventListener("change", () => majUnivers()));
    selNiveau.addEventListener("change", () => {
      serieWrap.style.display = NIVEAUX_AVEC_SERIE.includes(selNiveau.value) ? "block" : "none";
      majMatieresPreferees();
    });
    selSerie.addEventListener("change", () => majMatieresPreferees());
    filChecks.forEach(c => c.addEventListener("change", () => {
      const cochees = Array.from(filChecks).filter(x => x.checked);
      if (cochees.length > 2) { c.checked = false; msg.textContent = "2 filières maximum."; msg.className = "form-msg on err"; }
      else msg.className = "form-msg";
      majMatieresPreferees();
    }));

    profilForm.addEventListener("submit", async e => {
      e.preventDefault();
      const estSec = universActuel() === "sec";
      const filieres = estSec ? [] : Array.from(filChecks).filter(x => x.checked).map(x => x.value);
      if (!estSec && filieres.length === 0) { msg.textContent = "Choisis au moins une filière."; msg.className = "form-msg on err"; return; }

      const champs = {
        niveau: estSec ? selNiveau.value : null,
        serie: (estSec && NIVEAUX_AVEC_SERIE.includes(selNiveau.value)) ? selSerie.value : null,
        filieres: filieres,
        matieres_preferees: Array.from(matieresBox.querySelectorAll('input[name="matiere-pref"]:checked')).map(x => x.value),
        etablissement: (champEtablissement.value || "").trim() || null,
        ville: (champVille.value || "").trim() || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await DB.from("eleves").update(champs).eq("user_id", el.user_id);
      if (error) { msg.textContent = "Erreur : " + error.message; msg.className = "form-msg on err"; return; }
      msg.textContent = "Profil mis à jour !"; msg.className = "form-msg on ok";
      afficherResume({ ...el, ...champs });
    });
  }

  // Ma progression (mes tentatives de quiz)
  const progZone = document.getElementById("progressionZone");
  if (progZone && typeof DB !== "undefined" && DB) {
    const esc = s => (s || "").replace(/[&<>"']/g, c => (
      { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
    const dateFr = iso => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

    const { data: mesTentatives } = await DB.from("tentatives")
      .select("matiere, filiere, score, total, created_at")
      .eq("user_id", el.user_id)
      .order("created_at", { ascending: false });

    const { data: mesLeconsVues } = await DB.from("lecons_vues").select("id").eq("user_id", el.user_id);
    const nbLeconsLues = (mesLeconsVues || []).length;

    if (!mesTentatives || !mesTentatives.length) {
      progZone.innerHTML =
        '<div class="wait-box">'
        + '<div class="wi" data-icon="progres"></div>'
        + '<h3>Aucun quiz pour l\'instant</h3>'
        + '<p>Fais ton premier quiz pour voir ta progression apparaître ici.</p>'
        + '<a href="index.html#explorerSection" class="btn btn-primary">Voir les leçons et quiz <span>→</span></a>'
        + '</div>';
    } else {
      const nb = mesTentatives.length;
      const moy = Math.round(100 * mesTentatives.reduce((a, t) => a + (t.total ? t.score / t.total : 0), 0) / nb);
      const cartes =
        '<div class="db-grid" style="margin-bottom:22px">'
        + '<div class="db-carte"><div class="db-n">' + nb + '</div><div class="db-l">Quiz passés</div></div>'
        + '<div class="db-carte"><div class="db-n">' + moy + '%</div><div class="db-l">Score moyen</div></div>'
        + '<div class="db-carte"><div class="db-n">' + nbLeconsLues + '</div><div class="db-l">Leçons lues</div></div>'
        + '</div>';
      const liste = mesTentatives.slice(0, 12).map(t => {
        const pct = t.total ? Math.round(100 * t.score / t.total) : 0;
        return '<div class="db-activite">'
          + '<span class="db-nom">' + esc(t.matiere || "") + '</span>'
          + '<span class="db-score ' + (pct >= 50 ? "ok" : "low") + '">' + t.score + '/' + t.total + ' (' + pct + '%)</span>'
          + '<span style="color:var(--encre-2);font-size:.82rem">' + dateFr(t.created_at) + '</span>'
          + '</div>';
      }).join("");
      progZone.innerHTML = cartes + liste;
    }
  }

  // Mes duels (défis relevés)
  const duelsZone = document.getElementById("duelsZone");
  if (duelsZone && typeof DB !== "undefined" && DB) {
    const esc2 = s => (s || "").replace(/[&<>"']/g, c => (
      { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
    const dateFr2 = iso => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

    const { data: mesDuels } = await DB.from("duels")
      .select("quiz_titre, adversaire_nom, mon_score, mon_total, score_adversaire, total_adversaire, resultat, created_at")
      .eq("user_id", el.user_id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (!mesDuels || !mesDuels.length) {
      duelsZone.innerHTML =
        '<div class="wait-box">'
        + '<div class="wi" data-icon="progres"></div>'
        + '<h3>Aucun duel pour l\'instant</h3>'
        + '<p>Défie un.e ami.e depuis l\'écran de résultat d\'un quiz, ou relève un défi qu\'on t\'a envoyé !</p>'
        + '</div>';
    } else {
      const nbGagnes = mesDuels.filter(d => d.resultat === "gagne").length;
      duelsZone.innerHTML =
        '<div class="db-grid" style="margin-bottom:22px">'
        + '<div class="db-carte"><div class="db-n">' + mesDuels.length + '</div><div class="db-l">Duels joués</div></div>'
        + '<div class="db-carte"><div class="db-n">🏆 ' + nbGagnes + '</div><div class="db-l">Duels gagnés</div></div>'
        + '</div>'
        + mesDuels.map(d => {
            const badge = d.resultat === "gagne" ? '<span class="duel-badge gagne">🏆 Gagné</span>'
              : d.resultat === "perdu" ? '<span class="duel-badge perdu">Perdu</span>'
              : '<span class="duel-badge egalite">🤝 Égalité</span>';
            return '<div class="db-activite">'
              + '<span class="db-nom">vs ' + esc2(d.adversaire_nom) + '</span>'
              + '<span style="font-size:.85rem;color:var(--encre-2)">' + d.mon_score + '/' + d.mon_total + ' — ' + esc2(d.quiz_titre || "") + '</span>'
              + badge
              + '<span style="color:var(--encre-2);font-size:.8rem">' + dateFr2(d.created_at) + '</span>'
              + '</div>';
          }).join("");
    }
  }

  // Ma série (streak)
  const streakCard = document.getElementById("streakCard");
  const streakZone = document.getElementById("streakZone");
  if (streakZone && typeof DB !== "undefined" && DB) {
    const { data: eleveStreak } = await DB.from("eleves").select("streak_actuel, streak_record").eq("user_id", el.user_id).maybeSingle();
    const actuel = (eleveStreak && eleveStreak.streak_actuel) || 0;
    const record = (eleveStreak && eleveStreak.streak_record) || 0;
    if (actuel > 0 || record > 0) {
      streakCard.style.display = "block";
      streakZone.innerHTML =
        '<div class="db-grid">'
        + '<div class="db-carte"><div class="db-n">🔥 ' + actuel + '</div><div class="db-l">jour' + (actuel > 1 ? "s" : "") + ' de suite</div></div>'
        + '<div class="db-carte"><div class="db-n">' + record + '</div><div class="db-l">record personnel</div></div>'
        + '</div>';
    }
  }

  // Mes erreurs à retravailler (par matière)
  const erreursZone = document.getElementById("erreursZone");
  if (erreursZone && typeof DB !== "undefined" && DB) {
    const { data: mesErreurs } = await DB.from("erreurs").select("matiere, filiere").eq("user_id", el.user_id).eq("resolu", false);
    if (!mesErreurs || !mesErreurs.length) {
      erreursZone.innerHTML = '<p class="empty">Aucune erreur à retravailler pour l\'instant. Continue comme ça !</p>';
    } else {
      const parMatiere = {};
      mesErreurs.forEach(e => {
        const key = (e.matiere || "?") + "|" + (e.filiere || "");
        parMatiere[key] = (parMatiere[key] || 0) + 1;
      });
      erreursZone.innerHTML = Object.keys(parMatiere).map(key => {
        const [matiere, filiere] = key.split("|");
        const n = parMatiere[key];
        return '<div class="db-activite">'
          + '<span class="db-nom">' + matiere.replace(/[<>]/g, "") + '</span>'
          + '<span>' + n + ' question' + (n > 1 ? "s" : "") + '</span>'
          + '<a class="btn btn-ghost" style="padding:8px 16px;font-size:.85rem;color:var(--encre);border-color:var(--craie-2)" href="erreurs.html?matiere=' + encodeURIComponent(matiere) + (filiere ? "&f=" + filiere : "") + '">Retravailler →</a>'
          + '</div>';
      }).join("");
    }
  }

  // Déconnexion
  const out = document.getElementById("logoutBtn");
  if (out) out.addEventListener("click", async () => { await DB.auth.signOut(); location.href = "index.html"; });
}

document.addEventListener("DOMContentLoaded", () => {
  majMenuCompte();
  initInscription();
  initConnexion();
  initEspace();
});

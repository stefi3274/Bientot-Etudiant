/* ============================================================
   Comptes élèves — inscription, connexion, session, profil
   ============================================================ */

const FILIERES = {
  f1: "Médecine, Agronomie & Vétérinaire",
  f2: "Sciences administratives, Économie & Génie",
  f3: "Sciences humaines et sociales"
};

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
  if (el && el.nom) {
    const prenom = el.nom.split(" ")[0];
    zone.innerHTML = '<a href="espace.html" class="cta">Mon espace</a>';
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

  // gérer la limite de 2 filières
  const checks = form.querySelectorAll('input[name="filiere"]');
  checks.forEach(c => c.addEventListener("change", () => {
    const cochees = Array.from(checks).filter(x => x.checked);
    if (cochees.length > 2) { c.checked = false; show("Tu peux choisir 2 filières maximum.", "err"); }
    else msg.className = "form-msg";
  }));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nom = form.nom.value.trim();
    const email = form.email.value.trim();
    const pass = form.password.value;
    const filieres = Array.from(checks).filter(x => x.checked).map(x => x.value);

    if (!nom || !email || !pass) { show("Merci de remplir tous les champs.", "err"); return; }
    if (pass.length < 6) { show("Le mot de passe doit faire au moins 6 caractères.", "err"); return; }
    if (filieres.length === 0) { show("Choisis au moins une filière.", "err"); return; }
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
      filieres: filieres
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
  if (!el || !el.nom) { location.href = "connexion.html"; return; }

  // Nom + filières
  const nomEl = document.getElementById("espaceNom");
  if (nomEl) nomEl.textContent = el.nom.split(" ")[0];

  const filZone = document.getElementById("mesFilieres");
  if (filZone) {
    filZone.innerHTML = (el.filieres && el.filieres.length)
      ? el.filieres.map(f => '<span class="fil-tag ' + f + '">' + (FILIERES[f] || f) + '</span>').join("")
      : '<span class="fil-tag">Aucune filière choisie</span>';
  }

  // Pré-cocher les filières dans le formulaire de modification
  const checks = document.querySelectorAll('#filieresForm input[name="filiere"]');
  checks.forEach(c => { c.checked = (el.filieres || []).includes(c.value); });

  // Enregistrer les filières
  const filForm = document.getElementById("filieresForm");
  if (filForm) {
    const msg = document.getElementById("filieresMsg");
    checks.forEach(c => c.addEventListener("change", () => {
      const cochees = Array.from(checks).filter(x => x.checked);
      if (cochees.length > 2) { c.checked = false; msg.textContent = "2 filières maximum."; msg.className = "form-msg on err"; }
      else msg.className = "form-msg";
    }));
    filForm.addEventListener("submit", async e => {
      e.preventDefault();
      const filieres = Array.from(checks).filter(x => x.checked).map(x => x.value);
      if (filieres.length === 0) { msg.textContent = "Choisis au moins une filière."; msg.className = "form-msg on err"; return; }
      const { error } = await DB.from("eleves").update({ filieres, updated_at: new Date().toISOString() }).eq("user_id", el.user_id);
      if (error) { msg.textContent = "Erreur : " + error.message; msg.className = "form-msg on err"; return; }
      msg.textContent = "Filières mises à jour !"; msg.className = "form-msg on ok";
      if (filZone) filZone.innerHTML = filieres.map(f => '<span class="fil-tag ' + f + '">' + (FILIERES[f] || f) + '</span>').join("");
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

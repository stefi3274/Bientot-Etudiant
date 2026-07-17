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
  }
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

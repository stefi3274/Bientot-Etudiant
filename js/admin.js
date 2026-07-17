/* Admin — gestion des contributions */
(function () {
  const $ = id => document.getElementById(id);
  if (!PRET || !DB) { const s = $("setupNote"); if (s) s.style.display = "block"; return; }

  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const status = (m, t) => { const el = $("admStatus"); el.textContent = m; el.className = "status-msg on " + (t||"ok"); };
  const dateFr = iso => new Date(iso).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" });

  let filtre = "a_verifier";

  async function refreshAuth() {
    const { data } = await DB.auth.getSession();
    if (data.session) { $("loginCard").style.display = "none"; $("panel").style.display = "block"; charger(); }
    else { $("loginCard").style.display = "block"; $("panel").style.display = "none"; }
  }

  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const st = $("loginStatus");
    st.textContent = "Connexion…"; st.className = "status-msg on";
    const { error } = await DB.auth.signInWithPassword({ email: $("admEmail").value.trim(), password: $("admPass").value });
    if (error) { st.textContent = "Email ou mot de passe incorrect."; st.className = "status-msg on err"; return; }
    st.className = "status-msg"; refreshAuth();
  });

  $("logoutBtn").addEventListener("click", async () => { await DB.auth.signOut(); refreshAuth(); });

  document.querySelectorAll(".filter").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(x => x.classList.toggle("on", x === b));
      filtre = b.getAttribute("data-f");
      charger();
    });
  });

  async function charger() {
    const box = $("contribList");
    box.innerHTML = "<p class='empty'>Chargement…</p>";
    let q = DB.from("contributions").select("*").order("created_at", { ascending: false });
    if (filtre !== "tous") q = q.eq("statut", filtre);
    const { data, error } = await q;
    if (error) { box.innerHTML = "<p class='empty'>Erreur de chargement.</p>"; return; }
    if (!data.length) { box.innerHTML = "<p class='empty'>Aucune contribution dans cette catégorie.</p>"; return; }

    box.innerHTML = data.map(c => {
      const badge = { a_verifier:"À vérifier", valide:"Validée", rejete:"Rejetée" }[c.statut] || c.statut;
      const tags = [c.filiere, c.matiere, c.type_contenu].filter(Boolean)
        .map(t => '<span class="c-tag">' + esc(t) + '</span>').join("");
      return '<div class="contrib">'
        + '<div class="c-top"><b>' + esc(c.auteur) + '</b>'
        + '<span class="c-badge ' + c.statut + '">' + badge + '</span></div>'
        + (tags ? '<div class="c-meta">' + tags + '</div>' : '')
        + '<div class="c-row"><b>Contact :</b> ' + esc(c.contact || "—") + '</div>'
        + '<div class="c-row"><b>Reçu le :</b> ' + dateFr(c.created_at) + '</div>'
        + (c.message ? '<div class="c-row"><b>Message :</b> ' + esc(c.message) + '</div>' : '')
        + '<div class="c-sources"><b>Sources déclarées :</b> ' + esc(c.sources || "—") + '</div>'
        + '<div class="c-act">'
        + (c.fichier_url ? '<a class="dl" href="' + esc(c.fichier_url) + '" target="_blank" rel="noopener" download>⬇ Télécharger « ' + esc(c.fichier_nom || "fichier") + ' »</a>' : '')
        + (c.statut !== "valide" ? '<button class="ok" data-ok="' + c.id + '">✓ Valider</button>' : '')
        + (c.statut !== "rejete" ? '<button class="no" data-no="' + c.id + '">✕ Rejeter</button>' : '')
        + '<button class="del" data-del="' + c.id + '">Supprimer</button>'
        + '</div></div>';
    }).join("");

    box.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => setStatut(b.getAttribute("data-ok"), "valide"));
    box.querySelectorAll("[data-no]").forEach(b => b.onclick = () => setStatut(b.getAttribute("data-no"), "rejete"));
    box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => supprimer(b.getAttribute("data-del")));
  }

  async function setStatut(id, statut) {
    const { error } = await DB.from("contributions").update({ statut }).eq("id", id);
    if (error) status("Erreur : " + error.message, "err");
    else { status(statut === "valide" ? "Contribution validée." : "Contribution rejetée.", "ok"); charger(); }
  }

  async function supprimer(id) {
    if (!confirm("Supprimer définitivement cette contribution et son fichier ?")) return;
    const { data: c } = await DB.from("contributions").select("fichier_chemin").eq("id", id).maybeSingle();
    if (c && c.fichier_chemin) await DB.storage.from("Images").remove([c.fichier_chemin]);
    const { error } = await DB.from("contributions").delete().eq("id", id);
    if (error) status("Erreur : " + error.message, "err");
    else { status("Contribution supprimée.", "ok"); charger(); }
  }

  refreshAuth();
})();

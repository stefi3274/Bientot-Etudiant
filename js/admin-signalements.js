/* ============================================================
   Admin — Signalements de messages (modération de la messagerie)
   ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const statusS = (m, t) => { const el = $("sigMsg"); if (el) { el.textContent = m; el.className = "status-msg on " + (t || "ok"); } };

  document.querySelectorAll('.adm-tab[data-tab="signalements"]').forEach(t => {
    t.addEventListener("click", () => { if (typeof DB !== "undefined" && DB) chargerSignalements(); });
  });

  async function chargerSignalements() {
    const zone = $("sigListe");
    zone.innerHTML = "<p class='empty'>Chargement…</p>";

    const { data: sigs, error } = await DB.from("dm_signalements").select("*").order("created_at", { ascending: false });
    if (error) { zone.innerHTML = "<p class='empty'>Erreur de chargement : " + esc(error.message) + "</p>"; return; }
    if (!sigs || !sigs.length) { zone.innerHTML = "<p class='empty'>Aucun signalement pour l'instant.</p>"; return; }

    const messageIds = [...new Set(sigs.map(s => s.message_id))];
    const { data: msgs } = await DB.from("dm_messages").select("id, contenu, sender_id, supprime").in("id", messageIds);
    const msgParId = {}; (msgs || []).forEach(m => msgParId[m.id] = m);

    const userIds = [...new Set([
      ...sigs.map(s => s.signale_par),
      ...(msgs || []).map(m => m.sender_id)
    ])];
    const { data: profils } = await DB.from("eleves").select("user_id, nom").in("user_id", userIds);
    const nomParId = {}; (profils || []).forEach(p => nomParId[p.user_id] = p.nom);

    zone.innerHTML = sigs.map(s => {
      const m = msgParId[s.message_id];
      const contenuMsg = m ? (m.supprime ? "<em>Message déjà supprimé</em>" : esc(m.contenu)) : "<em>Message introuvable</em>";
      const auteur = m ? (nomParId[m.sender_id] || "Utilisateur inconnu") : "?";
      const rapporteur = nomParId[s.signale_par] || "Utilisateur inconnu";
      return '<div class="db-carte" style="margin-bottom:12px' + (s.traite ? ';opacity:.55' : '') + '">'
        + '<p style="font-size:.8rem;color:var(--encre-2);margin-bottom:6px">Signalé par <b>' + esc(rapporteur) + '</b> le ' + new Date(s.created_at).toLocaleString("fr-FR") + (s.traite ? " · <b>traité</b>" : "") + '</p>'
        + (s.raison ? '<p style="font-size:.85rem;margin-bottom:8px"><b>Raison :</b> ' + esc(s.raison) + '</p>' : '')
        + '<div style="background:var(--craie-2);border-radius:8px;padding:10px 14px;margin-bottom:10px">'
        + '<p style="font-size:.78rem;color:var(--encre-2);margin-bottom:4px">Message de <b>' + esc(auteur) + '</b> :</p>'
        + '<p>' + contenuMsg + '</p></div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
        + (s.traite ? '' : '<button class="btn btn-ghost sig-traiter" data-id="' + s.id + '" style="color:var(--encre);border-color:var(--craie-2)">Marquer comme traité</button>')
        + (m && !m.supprime ? '<button class="btn btn-ghost sig-suppr-msg" data-id="' + s.message_id + '" style="color:var(--rouge);border-color:var(--rouge)">Supprimer ce message</button>' : '')
        + '</div></div>';
    }).join("");

    zone.querySelectorAll(".sig-traiter").forEach(btn => btn.addEventListener("click", () => marquerTraite(btn.dataset.id)));
    zone.querySelectorAll(".sig-suppr-msg").forEach(btn => btn.addEventListener("click", () => supprimerMessageSignale(btn.dataset.id)));
  }

  async function marquerTraite(sigId) {
    const { error } = await DB.from("dm_signalements").update({ traite: true }).eq("id", sigId);
    if (error) { statusS("Erreur : " + error.message, "err"); return; }
    statusS("Signalement marqué comme traité.", "ok");
    chargerSignalements();
  }

  async function supprimerMessageSignale(msgId) {
    if (!confirm("Supprimer ce message de la conversation ? Cette action est irréversible.")) return;
    const { error } = await DB.from("dm_messages").update({ supprime: true, contenu: "" }).eq("id", msgId);
    if (error) { statusS("Erreur : " + error.message, "err"); return; }
    statusS("Message supprimé.", "ok");
    chargerSignalements();
  }
})();

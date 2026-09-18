/* ============================================================
   Messagerie — conversations 1 à 1, réponse citée, modifier,
   supprimer, signaler, bloquer. Couleur adaptée à l'univers
   de l'utilisateur connecté (Secondaire violet / Pré-Fac bleu).
   Restriction volontaire : on ne peut chercher/contacter que des
   personnes du même univers (Secondaire<->Secondaire, Pré-Fac<->Pré-Fac).
   ============================================================ */
(function () {
  const esc = s => (s || "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  let moi = null;           // { user_id, nom, niveau, filieres, ... }
  let moiEstSec = true;
  let conversations = [];   // liste enrichie (autre participant, dernier message)
  let convActive = null;    // objet conversation en cours
  let autreUtilisateur = null;
  let messagesActuels = []; // messages de la conversation ouverte
  let citationId = null;    // message_id auquel on répond
  let editionId = null;     // message_id en cours de modification
  let intervalPolling = null;

  const $ = id => document.getElementById(id);

  function dateFr(iso) {
    const d = new Date(iso);
    const auj = new Date();
    const memeJour = d.toDateString() === auj.toDateString();
    return memeJour
      ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  (async function init() {
    if (typeof DB === "undefined" || !DB) return;
    moi = await eleveActuel();
    if (!moi || !moi.nom) { $("msgNonConnecte").style.display = "block"; return; }

    moiEstSec = !!moi.niveau;
    document.body.dataset.universPage = moiEstSec ? "secondaire" : "prefac";
    $("msgApp").style.display = "block";
    appliquerCouleurUnivers();
    $("msgSousTitre").textContent = moiEstSec
      ? "Messages entre élèves du Secondaire"
      : "Messages entre élèves du Pré-Fac";

    brancherEvenements();
    await chargerConversations();
  })();

  function appliquerCouleurUnivers() {
    const hero = $("msgHero");
    if (moiEstSec) {
      hero.style.background = "linear-gradient(160deg,var(--secondaire),#5f4f96)";
    } else {
      hero.style.background = "linear-gradient(160deg,var(--prefac),var(--prefac-2))";
    }
  }
  function couleurBulle() { return moiEstSec ? "var(--secondaire)" : "var(--prefac)"; }

  // ============================================================
  // LISTE DES CONVERSATIONS
  // ============================================================
  async function chargerConversations() {
    const zone = $("listeConversations");
    zone.innerHTML = "<p class='empty'>Chargement…</p>";

    const { data: convs, error } = await DB.from("dm_conversations")
      .select("*")
      .or("participant_a.eq." + moi.user_id + ",participant_b.eq." + moi.user_id)
      .order("dernier_message_at", { ascending: false });

    if (error) { zone.innerHTML = "<p class='empty'>Erreur de chargement.</p>"; return; }
    if (!convs || !convs.length) {
      zone.innerHTML = "<p class='empty'>Aucune conversation pour l'instant. Clique sur \"Nouveau message\" pour commencer.</p>";
      conversations = [];
      return;
    }

    const autresIds = convs.map(c => c.participant_a === moi.user_id ? c.participant_b : c.participant_a);
    const { data: profils } = await DB.from("eleves").select("user_id, nom").in("user_id", autresIds);
    const nomsParId = {};
    (profils || []).forEach(p => { nomsParId[p.user_id] = p.nom; });

    // dernier message de chaque conversation (aperçu)
    const apercus = {};
    for (const c of convs) {
      const { data: dernier } = await DB.from("dm_messages")
        .select("contenu, supprime, sender_id, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      apercus[c.id] = dernier;
    }

    conversations = convs.map(c => {
      const autreId = c.participant_a === moi.user_id ? c.participant_b : c.participant_a;
      return { ...c, autreId, autreNom: nomsParId[autreId] || "Utilisateur", apercu: apercus[c.id] };
    });

    zone.innerHTML = conversations.map(c => {
      const a = c.apercu;
      let texteApercu = "Nouvelle conversation";
      if (a) {
        if (a.supprime) texteApercu = "Message supprimé";
        else texteApercu = (a.sender_id === moi.user_id ? "Toi : " : "") + a.contenu;
      }
      return '<div class="msg-conv-item" data-id="' + c.id + '" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--craie-2);cursor:pointer">'
        + '<div style="min-width:0"><b style="font-family:var(--serif)">' + esc(c.autreNom) + '</b>'
        + '<p style="margin:2px 0 0;color:var(--encre-2);font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(texteApercu.slice(0, 60)) + '</p></div>'
        + '<span style="font-size:.75rem;color:var(--encre-2);flex:0 0 auto">' + (a ? dateFr(a.created_at) : "") + '</span>'
        + '</div>';
    }).join("");

    zone.querySelectorAll(".msg-conv-item").forEach(el => {
      el.addEventListener("click", () => {
        const conv = conversations.find(c => c.id === el.dataset.id);
        if (conv) ouvrirConversation(conv);
      });
    });
  }

  // ============================================================
  // RECHERCHE D'UN NOUVEAU CONTACT (même univers uniquement)
  // ============================================================
  function brancherEvenements() {
    $("btnNouveauMsg").addEventListener("click", () => {
      const box = $("nouveauMsgBox");
      box.style.display = box.style.display === "none" ? "block" : "none";
      $("rechercheNom").focus();
    });

    let debounce = null;
    $("rechercheNom").addEventListener("input", function () {
      clearTimeout(debounce);
      const val = this.value.trim();
      if (!val) { $("resultatsRecherche").innerHTML = ""; return; }
      debounce = setTimeout(() => rechercherUtilisateur(val), 350);
    });

    $("btnRetourListe").addEventListener("click", fermerConversation);

    $("btnOptionsChat").addEventListener("click", () => {
      const m = $("optionsChatMenu");
      m.style.display = m.style.display === "none" ? "block" : "none";
    });
    $("btnBloquer").addEventListener("click", bloquerUtilisateurActif);

    $("annulerCitation").addEventListener("click", () => { citationId = null; $("citationActive").style.display = "none"; });
    $("annulerEdition").addEventListener("click", () => { editionId = null; $("editionActive").style.display = "none"; $("champMessage").value = ""; });

    $("formEnvoi").addEventListener("submit", e => { e.preventDefault(); envoyerOuModifier(); });
    $("champMessage").addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerOuModifier(); }
    });
  }

  async function rechercherUtilisateur(nom) {
    const zone = $("resultatsRecherche");
    zone.innerHTML = "<p class='empty' style='margin:8px 0'>Recherche…</p>";

    let q = DB.from("eleves").select("user_id, nom, niveau, filieres").ilike("nom", "%" + nom + "%").neq("user_id", moi.user_id).limit(15);
    q = moiEstSec ? q.not("niveau", "is", null) : q.is("niveau", null);
    const { data, error } = await q;

    if (error || !data || !data.length) { zone.innerHTML = "<p class='empty' style='margin:8px 0'>Personne trouvé.e.</p>"; return; }

    zone.innerHTML = data.map(u =>
      '<div class="msg-resultat" data-id="' + u.user_id + '" data-nom="' + esc(u.nom) + '" style="padding:10px 12px;cursor:pointer;border-radius:8px;font-size:.9rem">'
      + '<b>' + esc(u.nom) + '</b></div>'
    ).join("");
    zone.querySelectorAll(".msg-resultat").forEach(el => {
      el.addEventListener("mouseenter", () => el.style.background = "var(--craie)");
      el.addEventListener("mouseleave", () => el.style.background = "");
      el.addEventListener("click", () => demarrerConversation(el.dataset.id, el.dataset.nom));
    });
  }

  async function demarrerConversation(autreId, autreNom) {
    $("nouveauMsgBox").style.display = "none";
    $("rechercheNom").value = "";
    $("resultatsRecherche").innerHTML = "";

    // Conversation déjà existante ?
    let conv = conversations.find(c => c.autreId === autreId);
    if (!conv) {
      const { data: nouvelle, error } = await DB.from("dm_conversations").insert({
        participant_a: moi.user_id, participant_b: autreId
      }).select("*").single();
      if (error) {
        // la conversation existe peut-être déjà (contrainte unique) — on recharge et on cherche
        await chargerConversations();
        conv = conversations.find(c => c.autreId === autreId);
        if (!conv) { alert("Impossible de démarrer cette conversation pour le moment."); return; }
      } else {
        conv = { ...nouvelle, autreId, autreNom, apercu: null };
      }
    }
    ouvrirConversation(conv);
  }

  // ============================================================
  // CONVERSATION OUVERTE
  // ============================================================
  async function ouvrirConversation(conv) {
    convActive = conv;
    autreUtilisateur = { id: conv.autreId, nom: conv.autreNom };
    $("vueListe").style.display = "none";
    $("vueChat").style.display = "block";
    $("chatNomInterlocuteur").textContent = conv.autreNom;
    $("optionsChatMenu").style.display = "none";
    citationId = null; editionId = null;
    $("citationActive").style.display = "none";
    $("editionActive").style.display = "none";
    $("champMessage").value = "";

    await chargerMessages();
    if (intervalPolling) clearInterval(intervalPolling);
    intervalPolling = setInterval(chargerMessages, 4000);
  }

  function fermerConversation() {
    if (intervalPolling) { clearInterval(intervalPolling); intervalPolling = null; }
    $("vueChat").style.display = "none";
    $("vueListe").style.display = "block";
    convActive = null;
    chargerConversations();
  }

  async function chargerMessages() {
    if (!convActive) return;
    const { data, error } = await DB.from("dm_messages")
      .select("*").eq("conversation_id", convActive.id).order("created_at", { ascending: true });
    if (error) return;
    messagesActuels = data || [];
    rendreMessages();
  }

  function rendreMessages() {
    const zone = $("fenetreMessages");
    const dejaEnBas = zone.scrollTop + zone.clientHeight >= zone.scrollHeight - 40;
    const parId = {}; messagesActuels.forEach(m => parId[m.id] = m);

    zone.innerHTML = messagesActuels.map(m => {
      const estMoi = m.sender_id === moi.user_id;
      const couleur = estMoi ? couleurBulle() : "var(--craie-2)";
      const texteCouleur = estMoi ? "#fff" : "var(--encre)";
      let citationHtml = "";
      if (m.reply_to && parId[m.reply_to]) {
        const cite = parId[m.reply_to];
        citationHtml = '<div style="font-size:.78rem;opacity:.85;border-left:2px solid currentColor;padding-left:8px;margin-bottom:5px">' + esc((cite.supprime ? "Message supprimé" : cite.contenu).slice(0, 80)) + '</div>';
      }
      const contenuAffiche = m.supprime ? '<em style="opacity:.7">Message supprimé</em>' : esc(m.contenu).replace(/\n/g, "<br>");
      const badgeModifie = (m.modifie && !m.supprime) ? ' <span style="font-size:.72rem;opacity:.7">· modifié</span>' : "";

      return '<div class="msg-bulle-wrap" data-id="' + m.id + '" style="display:flex;flex-direction:column;align-items:' + (estMoi ? "flex-end" : "flex-start") + '">'
        + '<div class="msg-bulle" style="max-width:78%;background:' + couleur + ';color:' + texteCouleur + ';padding:10px 14px;border-radius:16px;' + (estMoi ? "border-bottom-right-radius:4px" : "border-bottom-left-radius:4px") + '">'
        + citationHtml
        + '<div>' + contenuAffiche + '</div>'
        + '</div>'
        + '<div style="font-size:.72rem;color:var(--encre-2);margin-top:3px;display:flex;gap:8px;align-items:center">'
        + '<span>' + dateFr(m.created_at) + badgeModifie + '</span>'
        + (m.supprime ? "" :
            '<button class="msg-action" data-action="repondre" data-id="' + m.id + '" style="background:none;border:0;cursor:pointer;color:var(--encre-2);text-decoration:underline;font-size:inherit">Répondre</button>'
            + (estMoi
                ? '<button class="msg-action" data-action="modifier" data-id="' + m.id + '" style="background:none;border:0;cursor:pointer;color:var(--encre-2);text-decoration:underline;font-size:inherit">Modifier</button>'
                + '<button class="msg-action" data-action="supprimer" data-id="' + m.id + '" style="background:none;border:0;cursor:pointer;color:var(--rouge);text-decoration:underline;font-size:inherit">Supprimer</button>'
                : '<button class="msg-action" data-action="signaler" data-id="' + m.id + '" style="background:none;border:0;cursor:pointer;color:var(--rouge);text-decoration:underline;font-size:inherit">Signaler</button>'))
        + '</div>'
        + '</div>';
    }).join("");

    zone.querySelectorAll(".msg-action").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id, action = btn.dataset.action;
        const m = parId[id];
        if (action === "repondre") activerCitation(m);
        else if (action === "modifier") activerEdition(m);
        else if (action === "supprimer") supprimerMessage(id);
        else if (action === "signaler") signalerMessage(id);
      });
    });

    if (dejaEnBas) zone.scrollTop = zone.scrollHeight;
  }

  function activerCitation(m) {
    editionId = null; $("editionActive").style.display = "none";
    citationId = m.id;
    $("citationTexte").textContent = (m.supprime ? "Message supprimé" : m.contenu).slice(0, 100);
    $("citationActive").style.display = "block";
    $("champMessage").focus();
  }

  function activerEdition(m) {
    citationId = null; $("citationActive").style.display = "none";
    editionId = m.id;
    $("champMessage").value = m.contenu;
    $("editionActive").style.display = "block";
    $("champMessage").focus();
  }

  async function envoyerOuModifier() {
    const champ = $("champMessage");
    const texte = champ.value.trim();
    if (!texte) return;
    const msgEl = $("chatMsg");

    if (editionId) {
      const { error } = await DB.from("dm_messages").update({
        contenu: texte, modifie: true, updated_at: new Date().toISOString()
      }).eq("id", editionId);
      if (error) { msgEl.textContent = "Erreur : " + error.message; msgEl.className = "status-msg on err"; return; }
      editionId = null; $("editionActive").style.display = "none";
    } else {
      const { error } = await DB.from("dm_messages").insert({
        conversation_id: convActive.id, sender_id: moi.user_id, contenu: texte,
        reply_to: citationId || null
      });
      if (error) { msgEl.textContent = "Message non envoyé (bloqué ou erreur)."; msgEl.className = "status-msg on err"; return; }
      citationId = null; $("citationActive").style.display = "none";
      await DB.from("dm_conversations").update({ dernier_message_at: new Date().toISOString() }).eq("id", convActive.id);
    }
    champ.value = "";
    msgEl.textContent = "";
    await chargerMessages();
    const zone = $("fenetreMessages"); zone.scrollTop = zone.scrollHeight;
  }

  async function supprimerMessage(id) {
    if (!confirm("Supprimer ce message ?")) return;
    await DB.from("dm_messages").update({ supprime: true, contenu: "", updated_at: new Date().toISOString() }).eq("id", id);
    chargerMessages();
  }

  async function signalerMessage(id) {
    const raison = prompt("Pourquoi signales-tu ce message ? (facultatif)") || null;
    const { error } = await DB.from("dm_signalements").insert({ message_id: id, signale_par: moi.user_id, raison });
    const msgEl = $("chatMsg");
    if (error) { msgEl.textContent = "Erreur lors du signalement."; msgEl.className = "status-msg on err"; }
    else { msgEl.textContent = "Message signalé. Merci, l'équipe va l'examiner."; msgEl.className = "status-msg on ok"; }
  }

  async function bloquerUtilisateurActif() {
    if (!autreUtilisateur) return;
    if (!confirm('Bloquer ' + autreUtilisateur.nom + ' ? Cette personne ne pourra plus t\'envoyer de messages.')) return;
    const { error } = await DB.from("dm_blocages").insert({ bloqueur_id: moi.user_id, bloque_id: autreUtilisateur.id });
    if (error && !error.message.includes("duplicate")) { alert("Erreur lors du blocage."); return; }
    alert(autreUtilisateur.nom + " a été bloqué.e.");
    fermerConversation();
  }
})();

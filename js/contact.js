/* Formulaire contact — Bientôt Étudiant */
(function () {
  const WHATSAPP = "50955108873";
  const form = document.getElementById("contactForm");
  if (!form) return;
  const msg = document.getElementById("contactMsg");
  const show = (m, t) => { if (msg) { msg.textContent = m; msg.className = "form-msg on " + t; } };

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    const nom = form.nom.value.trim();
    const contact = form.contact.value.trim();
    const filiere = form.filiere.value;
    const message = form.message.value.trim();

    if (!nom || !contact || !message) { show("Merci de remplir les champs obligatoires.", "err"); return; }

    btn.disabled = true;
    show("Envoi…", "");

    // 1) Enregistrer sur Supabase
    let ok = false;
    if (DB) {
      const ent = await entrepriseId();
      if (ent) {
        const { error } = await DB.from("enregistrements").insert({
          entreprise_id: ent,
          type: "contact",
          donnees: { nom, contact, filiere, message }
        });
        ok = !error;
      }
    }

    // 2) Proposer l'envoi WhatsApp (canal direct)
    const texte = encodeURIComponent(
      "Bonjour Bientôt Étudiant !\n\n" +
      "Nom : " + nom + "\n" +
      "Contact : " + contact + "\n" +
      (filiere ? "Filière : " + filiere + "\n" : "") +
      "\n" + message);
    const waLink = "https://wa.me/" + WHATSAPP + "?text=" + texte;

    if (ok) {
      show("Message enregistré ! Vous pouvez aussi nous écrire directement sur WhatsApp.", "ok");
    } else {
      show("Envoyez votre message via WhatsApp en cliquant ci-dessous.", "ok");
    }

    // Bouton WhatsApp
    let wa = document.getElementById("waAfter");
    if (!wa) {
      wa = document.createElement("a");
      wa.id = "waAfter";
      wa.className = "btn btn-primary";
      wa.style.marginTop = "14px";
      wa.target = "_blank"; wa.rel = "noopener";
      wa.innerHTML = "Continuer sur WhatsApp →";
      msg.after(wa);
    }
    wa.href = waLink;

    if (ok) form.reset();
    btn.disabled = false;
  });
})();

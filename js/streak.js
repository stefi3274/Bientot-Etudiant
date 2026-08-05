/* ============================================================
   Streak — série de jours consécutifs de révision.
   Appelée à chaque quiz terminé (leçon, libre, ou révision
   des erreurs). Incrémente si la dernière activité était hier,
   remet à 1 si le fil est rompu, ne change rien si déjà compté
   aujourd'hui.
   ============================================================ */
async function majStreak(el) {
  if (!el || !el.user_id || typeof DB === "undefined" || !DB) return null;
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const { data: eleve } = await DB.from("eleves")
    .select("streak_actuel, streak_record, derniere_activite")
    .eq("user_id", el.user_id).maybeSingle();
  if (!eleve) return null;

  let streakActuel = eleve.streak_actuel || 0;
  let streakRecord = eleve.streak_record || 0;

  if (eleve.derniere_activite === aujourdhui) {
    return { streak_actuel: streakActuel, streak_record: streakRecord, nouveau: false };
  }

  const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  streakActuel = (eleve.derniere_activite === hier) ? streakActuel + 1 : 1;
  streakRecord = Math.max(streakRecord, streakActuel);

  await DB.from("eleves").update({
    streak_actuel: streakActuel, streak_record: streakRecord, derniere_activite: aujourdhui
  }).eq("user_id", el.user_id);

  return { streak_actuel: streakActuel, streak_record: streakRecord, nouveau: true };
}
window.majStreak = majStreak;

/* Connexion Supabase — Bientôt Étudiant (slug 'bientot') */
const SUPABASE_URL = "https://darzhfamxnycdglcglgg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcnpoZmFteG55Y2RnbGNnbGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDUzNjcsImV4cCI6MjA5NTkyMTM2N30.uHMDHR4df8oYGIqLonLwAgEDzzdu1s7yj7VWtp3KUBQ";
const SLUG = "bientot";

const PRET = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const DB = PRET ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function entrepriseId() {
  if (!DB) return null;
  const { data } = await DB.from("entreprises").select("id").eq("slug", SLUG).maybeSingle();
  return data ? data.id : null;
}

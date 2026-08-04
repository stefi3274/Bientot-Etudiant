-- ============================================================
-- 3 nouvelles fonctionnalités : Mes erreurs / Streak / Classement Super Quiz
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ---------- 1. Mes erreurs (questions ratées à retravailler) ----------
CREATE TABLE IF NOT EXISTS erreurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  quiz_id uuid REFERENCES quiz(id) ON DELETE SET NULL,
  filiere text,
  matiere text,
  resolu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);
ALTER TABLE erreurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eleve_gere_ses_erreurs" ON erreurs;
CREATE POLICY "eleve_gere_ses_erreurs" ON erreurs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------- 2. Streak (série de jours consécutifs) ----------
ALTER TABLE eleves ADD COLUMN IF NOT EXISTS streak_actuel integer NOT NULL DEFAULT 0;
ALTER TABLE eleves ADD COLUMN IF NOT EXISTS streak_record integer NOT NULL DEFAULT 0;
ALTER TABLE eleves ADD COLUMN IF NOT EXISTS derniere_activite date;

-- ---------- 3. Classement du Super Quiz ----------
CREATE TABLE IF NOT EXISTS super_tentatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nom text,
  score integer NOT NULL,
  total integer NOT NULL,
  temps_sec integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE super_tentatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lecture_publique_super_tentatives" ON super_tentatives;
CREATE POLICY "lecture_publique_super_tentatives" ON super_tentatives
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "eleve_insere_sa_super_tentative" ON super_tentatives;
CREATE POLICY "eleve_insere_sa_super_tentative" ON super_tentatives
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

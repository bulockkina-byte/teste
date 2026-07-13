-- =====================================================
-- TABELA DE USUÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'lider',
  previous_role TEXT,
  person_id UUID,
  person_type TEXT CHECK (person_type IN ('bombeiro', 'apoc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_all" ON usuarios FOR ALL USING (true) WITH CHECK (true);

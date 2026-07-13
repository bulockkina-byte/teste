-- =====================================================
-- SESCINC-MANAGER: Tabela de Estoque de EPIs
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. TABELA DE ESTOQUE DE EPIs
CREATE TABLE IF NOT EXISTS epis_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  ca TEXT NOT NULL DEFAULT '',
  fornecedor TEXT NOT NULL DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 0,
  data_fabricacao TEXT NOT NULL DEFAULT '',
  tempo_validade_meses INTEGER NOT NULL DEFAULT 0,
  data_validade TEXT NOT NULL DEFAULT '',
  tamanho TEXT NOT NULL DEFAULT '',
  numero_serie TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'Novo',
  notas TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE epis_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "epis_estoque_all" ON epis_estoque FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_epis_estoque_nome ON epis_estoque(nome);
CREATE INDEX IF NOT EXISTS idx_epis_estoque_ca ON epis_estoque(ca);

-- 2. ADICIONAR COLUNAS NA TABELA EPIS EXISTENTE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epis' AND column_name = 'data_fabricacao') THEN
    ALTER TABLE epis ADD COLUMN data_fabricacao TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epis' AND column_name = 'tamanho') THEN
    ALTER TABLE epis ADD COLUMN tamanho TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epis' AND column_name = 'numero_serie') THEN
    ALTER TABLE epis ADD COLUMN numero_serie TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'epis' AND column_name = 'estado') THEN
    ALTER TABLE epis ADD COLUMN estado TEXT NOT NULL DEFAULT 'Novo';
  END IF;
END $$;

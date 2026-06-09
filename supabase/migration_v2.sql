-- ExpoLeads v2 — novos campos para funcionalidades enterprise
-- Rodar no Supabase SQL Editor

-- Novos campos em el_leads
ALTER TABLE el_leads
  ADD COLUMN IF NOT EXISTS score         int2,
  ADD COLUMN IF NOT EXISTS fonte         text DEFAULT 'form',
  ADD COLUMN IF NOT EXISTS responsavel   text,
  ADD COLUMN IF NOT EXISTS tags          text[],
  ADD COLUMN IF NOT EXISTS historico     jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS campos_extras_valores jsonb;

-- Novos campos em el_eventos
ALTER TABLE el_eventos
  ADD COLUMN IF NOT EXISTS segmento text DEFAULT 'feira',
  ADD COLUMN IF NOT EXISTS config   jsonb DEFAULT '{}'::jsonb;

-- Índices para performance
CREATE INDEX IF NOT EXISTS el_leads_evento_status ON el_leads (evento_id, status);
CREATE INDEX IF NOT EXISTS el_leads_created_at    ON el_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS el_leads_score         ON el_leads (score) WHERE score IS NOT NULL;

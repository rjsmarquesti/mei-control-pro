-- Migration 006: Adiciona colunas competencia e paid_at na tabela das_payments
-- Aplicado manualmente via SSH em 2026-04-29

ALTER TABLE sismei.das_payments
  ADD COLUMN IF NOT EXISTS competencia TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_das_payments_competencia
  ON sismei.das_payments (user_id, competencia);

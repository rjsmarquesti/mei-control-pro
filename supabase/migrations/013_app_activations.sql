-- Migration 013: Tabela de ativações do app Android MEI Control Pro Kit
-- Registra cada ativação de licença com suporte a revogação por email

CREATE TABLE IF NOT EXISTS sismei.activations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL,
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked         BOOLEAN     NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT
);

CREATE INDEX IF NOT EXISTS activations_email_idx ON sismei.activations (email);

-- RLS: só service_role acessa (app usa API route, não acesso direto)
ALTER TABLE sismei.activations ENABLE ROW LEVEL SECURITY;

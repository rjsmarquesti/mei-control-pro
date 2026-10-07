-- Índices compostos na tabela transactions para eliminar full table scans
-- Todas as queries de dashboard/finance filtram por user_id + date e/ou type

CREATE INDEX IF NOT EXISTS idx_sismei_transactions_user_date
  ON sismei.transactions(user_id, date DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_sismei_transactions_user_type_date
  ON sismei.transactions(user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS idx_sismei_transactions_user_status_date
  ON sismei.transactions(user_id, status, date DESC);

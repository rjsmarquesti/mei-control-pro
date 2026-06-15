-- Migration 012: Configurações globais do app Android MEI Control Pro Kit
-- Adiciona mei_limite_anual e irpf_tabela em system_settings

INSERT INTO sismei.system_settings (key, value, label, updated_at)
VALUES
  (
    'mei_limite_anual',
    '81000',
    'Limite anual MEI (R$)',
    NOW()
  ),
  (
    'irpf_tabela',
    '[{"limite":22847.76,"aliquota":0,"deducao":0},{"limite":33919.80,"aliquota":0.075,"deducao":1713.58},{"limite":45012.60,"aliquota":0.15,"deducao":4257.57},{"limite":55976.16,"aliquota":0.225,"deducao":7633.51},{"limite":999999999,"aliquota":0.275,"deducao":10432.32}]',
    'Tabela IRPF (JSON) — faixas anuais',
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

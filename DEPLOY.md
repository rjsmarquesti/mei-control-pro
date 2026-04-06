# MEI Control Pro — Deploy no EasyPanel com Docker

## Visão Geral

```
GitHub (código) → EasyPanel (build Docker) → App online
                       ↕
               Supabase (banco de dados)
```

---

## Pré-requisitos

- Conta no GitHub com o repositório `rjsmarquesti/mei-control-pro`
- EasyPanel instalado na VPS
- Supabase rodando em `https://db.divulgabr.com.br`
- Tabelas criadas no Supabase (ver Passo 1)

---

## Passo 1 — Criar as tabelas no Supabase

1. Acesse `https://db.divulgabr.com.br`
2. Vá em **SQL Editor → New Query**
3. Cole e execute o SQL abaixo:

```sql
-- Tabela de transações (receitas e despesas)
CREATE TABLE IF NOT EXISTS transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  description TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Outros',
  value       NUMERIC(10, 2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pagamentos DAS
CREATE TABLE IF NOT EXISTS das_payments (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  value      NUMERIC(10, 2) NOT NULL,
  due_date   DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segurança: cada usuário vê apenas seus dados
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE das_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions: user owns data"
  ON transactions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "das_payments: user owns data"
  ON das_payments FOR ALL USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_das_payments_user ON das_payments (user_id, due_date);
```

4. Clique em **Run** — deve retornar sem erros

---

## Passo 2 — Acessar o EasyPanel

1. Acesse o painel da sua VPS via EasyPanel
2. Faça login com suas credenciais

---

## Passo 3 — Criar o Projeto

1. Na tela inicial clique em **+ Create Project**
2. **Name:** `mei-control-pro`
3. Clique em **Create**

---

## Passo 4 — Criar o Serviço

1. Dentro do projeto clique em **+ Create Service**
2. Selecione **App**
3. **Name:** `app`
4. Clique em **Create**

---

## Passo 5 — Conectar ao GitHub

1. Na aba **Source** do serviço:
   - **Provider:** GitHub
   - Clique em **Connect GitHub** (se ainda não estiver conectado)
   - Autorize o EasyPanel a acessar seus repositórios
2. Selecione o repositório: `rjsmarquesti/mei-control-pro`
3. **Branch:** `main`
4. Clique em **Save**

---

## Passo 6 — Configurar o Build

1. Na aba **Build**:
   - **Build Method:** `Dockerfile`
   - **Dockerfile Path:** `Dockerfile`
   - **Build Context:** `.` (ponto — raiz do projeto)
2. Clique em **Save**

---

## Passo 7 — Configurar as Variáveis de Ambiente

1. Na aba **Environment**, adicione as seguintes variáveis:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://db.divulgabr.com.br` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (sua anon key) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

2. Clique em **Save**

> ⚠️ Nunca exponha a `service_role` key — use sempre a `anon` key no frontend.

---

## Passo 8 — Configurar a Porta

1. Na aba **Ports**:
   - **Port:** `3000`
   - **Protocol:** `HTTP`
2. Clique em **Save**

---

## Passo 9 — Configurar o Domínio

1. Na aba **Domains**:
   - Clique em **+ Add Domain**
   - Digite seu domínio: ex. `mei.seudominio.com.br`
   - Ative **HTTPS** (certificado Let's Encrypt automático)
2. Clique em **Save**

> Se não tiver domínio próprio, o EasyPanel oferece um subdomínio gratuito como `app-xxx.easypanel.host`

---

## Passo 10 — Fazer o Deploy

1. Clique no botão **Deploy**
2. Vá na aba **Logs** e acompanhe o processo:

```
[1/3] Instalando dependências...     ~1 min
[2/3] Compilando o projeto (build)... ~2 min
[3/3] Iniciando o servidor...         ~10s
```

3. Quando aparecer `✓ Ready` o sistema está no ar

---

## Verificar se está funcionando

Acesse o domínio configurado no browser. Você deve ver:

- Redirect automático para `/dashboard`
- Dashboard carregando com dados simulados (mock) ou reais do Supabase
- Toggle dark/light funcionando
- Layout responsivo no mobile

---

## Deploy automático (CI/CD)

O EasyPanel pode fazer deploy automaticamente a cada `git push`:

1. Na aba **Source**, ative **Auto Deploy**
2. A partir de agora, qualquer push na branch `main` dispara um novo deploy

---

## Atualizar o sistema

Para publicar uma nova versão:

```bash
# Na sua máquina local
git add .
git commit -m "feat: descrição da atualização"
git push
```

O EasyPanel detecta o push e faz o redeploy automaticamente.

---

## Solução de Problemas

### Build falhou
- Verifique os logs na aba **Logs**
- Erro comum: variável de ambiente faltando → cheque o Passo 7

### Página não abre
- Verifique se a porta `3000` está configurada (Passo 8)
- Confira se o domínio aponta para o IP da VPS (DNS)

### Dados não aparecem (tela vazia)
- O sistema usa dados simulados automaticamente enquanto as tabelas estiverem vazias
- Para dados reais, insira transações via Supabase → Table Editor

### Supabase não conecta
- Confirme que `https://db.divulgabr.com.br` está acessível
- Verifique se a `ANON_KEY` está correta nas variáveis de ambiente

### Reiniciar o serviço
- No EasyPanel, clique em **Restart** no serviço

---

## Estrutura do Dockerfile (resumo)

```
Stage 1 — deps:     instala node_modules
Stage 2 — builder:  executa npm run build (Next.js standalone)
Stage 3 — runner:   imagem final enxuta (~150MB), roda node server.js
```

---

*MEI Control Pro © 2025 — Deploy guide v1.0*

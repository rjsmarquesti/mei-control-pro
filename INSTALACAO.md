# MEI Control Pro — Manual de Instalação

## Requisitos

| Ferramenta | Versão mínima | Download |
|------------|---------------|----------|
| Node.js | 18.17 ou superior | https://nodejs.org |
| npm | 9.x ou superior | (incluído com Node.js) |
| Git | qualquer | https://git-scm.com |

Para verificar se já estão instalados:

```bash
node -v
npm -v
git --version
```

---

## 1. Clonar ou copiar o projeto

### Opção A — Se está usando Git:
```bash
git clone <url-do-repositorio>
cd mei-control-pro
```

### Opção B — Se recebeu a pasta diretamente:
```bash
cd mei-control-pro
```

---

## 2. Instalar dependências

```bash
npm install
```

Aguarde o download de todos os pacotes (pode levar 1–3 minutos na primeira vez).

---

## 3. Configurar variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# URL do backend Odoo (opcional — sem isso roda com dados simulados)
NEXT_PUBLIC_API_URL=http://localhost:8069

# Token de autenticação (opcional)
NEXT_PUBLIC_API_TOKEN=seu_token_aqui
```

> **Sem backend?** O sistema funciona normalmente com dados simulados (mock data). Não é necessário configurar o `.env.local` para testar.

---

## 4. Rodar em desenvolvimento

```bash
npm run dev
```

Abra o browser em: **http://localhost:3000**

O sistema redireciona automaticamente para `/dashboard`.

---

## 5. Build para produção

```bash
# Gerar build otimizado
npm run build

# Iniciar servidor de produção
npm start
```

O servidor de produção sobe na porta **3000** por padrão.

---

## 6. Estrutura de pastas

```
mei-control-pro/
├── app/                    # Páginas (Next.js App Router)
│   ├── layout.tsx          # Layout raiz com ThemeProvider
│   ├── globals.css         # Design system, variáveis CSS, utilitários
│   ├── page.tsx            # Redirect → /dashboard
│   └── dashboard/
│       └── page.tsx        # Dashboard principal
│
├── components/
│   ├── layout/             # Sidebar, Header, MobileNav, DashboardLayout
│   ├── charts/             # RevenueExpenseChart, ExpenseCategoryChart
│   ├── dashboard/          # Cards, Tabela, Ações, Customizador
│   └── ui/                 # Badge, Button, SkeletonCard
│
├── services/
│   ├── api.ts              # Instância Axios + interceptors (Odoo REST)
│   └── finance.ts          # getDashboard, getTransactions, createRevenue, createExpense
│
├── store/
│   └── useAppStore.ts      # Estado global Zustand (persiste no localStorage)
│
├── hooks/
│   └── useDashboard.ts     # Hook que carrega todos os dados do dashboard
│
├── types/
│   └── index.ts            # Interfaces TypeScript
│
├── lib/
│   └── utils.ts            # cn(), formatCurrency(), formatDate(), getGreeting()
│
├── .env.local              # Variáveis de ambiente (criar manualmente)
├── package.json
├── tailwind.config.ts
├── next.config.mjs
└── tsconfig.json
```

---

## 7. Integração com Odoo (backend)

O arquivo `services/finance.ts` já está preparado. Cada função tenta a API real e,
em caso de erro, usa os dados simulados automaticamente.

### Endpoints esperados no Odoo:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/mei/dashboard` | Métricas gerais |
| GET | `/api/mei/transactions` | Lista de movimentações |
| GET | `/api/mei/chart-data` | Dados para o gráfico anual |
| GET | `/api/mei/categories` | Categorias com percentuais |
| POST | `/api/mei/revenues` | Criar nova receita |
| POST | `/api/mei/expenses` | Criar nova despesa |

### Autenticação:

O sistema injeta automaticamente o token via header `Authorization: Bearer <token>`.
Salve o token no localStorage com a chave `auth_token`:

```javascript
localStorage.setItem('auth_token', 'seu_token_aqui')
```

---

## 8. Personalização da marca

Dentro do dashboard, no painel **"Personalização da sua marca"** (canto inferior direito), é possível:

- Fazer upload da logo (PNG, SVG ou JPG)
- Escolher a cor primária (8 predefinidas + picker livre)
- Alternar entre tema claro, escuro ou sistema
- Mudar a tipografia
- Definir o nome da empresa

Todas as preferências são salvas automaticamente no `localStorage` e persistem entre sessões.

---

## 9. Problemas comuns

### Porta 3000 ocupada
```bash
# Rodar em outra porta
npm run dev -- -p 3001
```

### Erro "Cannot find module"
```bash
# Limpar cache e reinstalar
rm -rf node_modules .next
npm install
npm run dev
```

### Erro de tipagem TypeScript
```bash
# Verificar erros sem rodar o servidor
npx tsc --noEmit
```

### Tela em branco / hydration error
Limpe o localStorage do browser (F12 → Application → Local Storage → Clear All) e recarregue.

---

## 10. Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build otimizado para produção |
| `npm start` | Inicia o servidor de produção (requer build) |
| `npm run lint` | Verifica erros de lint (ESLint) |

---

## Stack utilizada

- **Next.js 14** — App Router, SSR/SSG
- **React 18** + **TypeScript**
- **TailwindCSS** — Estilização utility-first
- **Zustand** — Estado global com persistência
- **Axios** — Requisições HTTP para o Odoo
- **Recharts** — Gráficos de área e donut
- **Framer Motion** — Animações e microinterações
- **next-themes** — Toggle dark/light mode
- **Lucide React** — Ícones

---

*MEI Control Pro © 2025 — Todos os direitos reservados*

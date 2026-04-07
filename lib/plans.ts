export type Plan = 'free' | 'basic' | 'pro' | 'premium'

export interface PlanConfig {
  id: Plan
  name: string
  price: number
  color: string
  description: string
  features: string[]
}

// Hierarquia: free < basic < pro < premium
const PLAN_LEVEL: Record<Plan, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  premium: 3,
}

// Qual plano mínimo cada rota exige
export const ROUTE_PLAN: Record<string, Plan> = {
  '/dashboard': 'free',
  '/dashboard/receitas': 'free',
  '/dashboard/despesas': 'free',
  '/dashboard/perfil': 'free',
  '/dashboard/assinatura': 'free',
  '/dashboard/financeiro': 'basic',
  '/dashboard/categorias': 'basic',
  '/dashboard/relatorios': 'pro',
  '/dashboard/das': 'pro',
  '/dashboard/irpf': 'premium',
}

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    color: '#6B7280',
    description: 'Para quem está começando',
    features: ['Dashboard', 'Receitas e despesas (20/mês)', 'Perfil'],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19.90,
    color: '#06B6D4',
    description: 'Para MEI organizado',
    features: ['Tudo do Gratuito', 'Lançamentos ilimitados', 'Financeiro', 'Categorias'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39.90,
    color: '#7C3AED',
    description: 'Para MEI em crescimento',
    features: ['Tudo do Basic', 'Relatórios avançados', 'DAS & Impostos', 'Exportar PDF'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 59.90,
    color: '#F59E0B',
    description: 'Acesso total',
    features: ['Tudo do Pro', 'IRPF Anual automático', 'Suporte prioritário'],
  },
]

export function hasAccess(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_LEVEL[userPlan] >= PLAN_LEVEL[requiredPlan]
}

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLAN_CONFIGS.find(p => p.id === plan) ?? PLAN_CONFIGS[0]
}

export function getRequiredPlanForRoute(route: string): Plan {
  return ROUTE_PLAN[route] ?? 'free'
}

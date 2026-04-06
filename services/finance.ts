import { supabase } from '@/lib/supabase'
import type { DashboardMetrics, Transaction, ChartData, CategoryData } from '@/types'

// ── Mock Data (fallback) ─────────────────────────────────────────────────────

const mockMetrics: DashboardMetrics = {
  monthRevenue: 8200,
  annualRevenue: 52000,
  monthExpenses: 2100,
  netProfit: 6100,
  meiLimit: 81000,
  meiUsed: 52000,
  dasValue: 70.6,
  dasDueDate: '2025-04-20',
  monthRevenueGrowth: 12,
  monthExpensesGrowth: 8,
  netProfitGrowth: 18,
}

const mockChartData: ChartData[] = [
  { month: 'Jan', receita: 3500, despesa: 800, lucro: 2700 },
  { month: 'Fev', receita: 4200, despesa: 1200, lucro: 3000 },
  { month: 'Mar', receita: 3800, despesa: 950, lucro: 2850 },
  { month: 'Abr', receita: 5100, despesa: 1400, lucro: 3700 },
  { month: 'Mai', receita: 4700, despesa: 1100, lucro: 3600 },
  { month: 'Jun', receita: 9850, despesa: 2340, lucro: 7510 },
  { month: 'Jul', receita: 6200, despesa: 1600, lucro: 4600 },
  { month: 'Ago', receita: 7100, despesa: 1900, lucro: 5200 },
  { month: 'Set', receita: 6800, despesa: 1750, lucro: 5050 },
  { month: 'Out', receita: 8500, despesa: 2100, lucro: 6400 },
  { month: 'Nov', receita: 9200, despesa: 2300, lucro: 6900 },
  { month: 'Dez', receita: 10500, despesa: 2600, lucro: 7900 },
]

const mockTransactions: Transaction[] = [
  { id: '1', date: '2025-04-06', type: 'revenue', description: 'Cliente X — Dev Web', category: 'Serviços', value: 500, status: 'completed' },
  { id: '2', date: '2025-04-05', type: 'expense', description: 'Plano de Internet', category: 'Infraestrutura', value: 120, status: 'completed' },
  { id: '3', date: '2025-04-04', type: 'revenue', description: 'Consultoria Serviço Y', category: 'Consultoria', value: 800, status: 'completed' },
  { id: '4', date: '2025-04-03', type: 'expense', description: 'Materiais de Escritório', category: 'Material', value: 300, status: 'pending' },
  { id: '5', date: '2025-04-02', type: 'revenue', description: 'Cliente Z — Landing Page', category: 'Serviços', value: 1250, status: 'completed' },
  { id: '6', date: '2025-04-01', type: 'expense', description: 'Assinatura Adobe CC', category: 'Tecnologia', value: 89, status: 'completed' },
  { id: '7', date: '2025-03-31', type: 'revenue', description: 'Projeto Alpha — E-commerce', category: 'Projetos', value: 3500, status: 'pending' },
  { id: '8', date: '2025-03-30', type: 'expense', description: 'Hospedagem VPS', category: 'Tecnologia', value: 45, status: 'completed' },
]

const mockCategoryData: CategoryData[] = [
  { name: 'Serviços', value: 45, color: '#7C3AED', amount: 3690 },
  { name: 'Consultoria', value: 25, color: '#06B6D4', amount: 2050 },
  { name: 'Projetos', value: 20, color: '#10B981', amount: 1640 },
  { name: 'Outros', value: 10, color: '#F59E0B', amount: 820 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

function getCurrentYearRange() {
  const year = new Date().getFullYear()
  const start = new Date(year, 0, 1).toISOString()
  const end = new Date(year, 11, 31, 23, 59, 59).toISOString()
  return { start, end }
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CATEGORY_COLORS: Record<string, string> = {
  Serviços: '#7C3AED',
  Consultoria: '#06B6D4',
  Projetos: '#10B981',
  Infraestrutura: '#F59E0B',
  Material: '#EF4444',
  Tecnologia: '#8B5CF6',
  Outros: '#6B7280',
}

// ── Service ──────────────────────────────────────────────────────────────────

export const financeService = {
  async getDashboard(): Promise<DashboardMetrics> {
    try {
      const { start: monthStart, end: monthEnd } = getCurrentMonthRange()
      const { start: yearStart, end: yearEnd } = getCurrentYearRange()

      const [monthRev, monthExp, yearRev, dasData] = await Promise.all([
        supabase
          .from('transactions')
          .select('value')
          .eq('type', 'revenue')
          .eq('status', 'completed')
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('transactions')
          .select('value')
          .eq('type', 'expense')
          .eq('status', 'completed')
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('transactions')
          .select('value')
          .eq('type', 'revenue')
          .eq('status', 'completed')
          .gte('date', yearStart)
          .lte('date', yearEnd),
        supabase
          .from('das_payments')
          .select('value, due_date')
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(1),
      ])

      if (monthRev.error) throw monthRev.error

      const monthRevenue = (monthRev.data ?? []).reduce((s, r) => s + r.value, 0)
      const monthExpenses = (monthExp.data ?? []).reduce((s, r) => s + r.value, 0)
      const annualRevenue = (yearRev.data ?? []).reduce((s, r) => s + r.value, 0)
      const netProfit = monthRevenue - monthExpenses
      const das = dasData.data?.[0]

      return {
        monthRevenue,
        annualRevenue,
        monthExpenses,
        netProfit,
        meiLimit: 81000,
        meiUsed: annualRevenue,
        dasValue: das?.value ?? 70.6,
        dasDueDate: das?.due_date ?? '2025-04-20',
        monthRevenueGrowth: 12,
        monthExpensesGrowth: 8,
        netProfitGrowth: netProfit > 0 ? Math.round((netProfit / monthRevenue) * 100) : 0,
      }
    } catch {
      return mockMetrics
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(20)

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: String(row.id),
        date: row.date,
        type: row.type,
        description: row.description,
        category: row.category,
        value: row.value,
        status: row.status,
      }))
    } catch {
      return mockTransactions
    }
  },

  async getChartData(): Promise<ChartData[]> {
    try {
      const year = new Date().getFullYear()
      const { data, error } = await supabase
        .from('transactions')
        .select('date, type, value')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .eq('status', 'completed')

      if (error) throw error

      const grouped: Record<number, { receita: number; despesa: number }> = {}
      for (let m = 0; m < 12; m++) grouped[m] = { receita: 0, despesa: 0 }

      for (const row of data ?? []) {
        const month = new Date(row.date).getMonth()
        if (row.type === 'revenue') grouped[month].receita += row.value
        else grouped[month].despesa += row.value
      }

      return Object.entries(grouped).map(([m, v]) => ({
        month: MONTHS[Number(m)],
        receita: v.receita,
        despesa: v.despesa,
        lucro: v.receita - v.despesa,
      }))
    } catch {
      return mockChartData
    }
  },

  async getCategoryData(): Promise<CategoryData[]> {
    try {
      const { start, end } = getCurrentYearRange()
      const { data, error } = await supabase
        .from('transactions')
        .select('category, value')
        .eq('type', 'revenue')
        .eq('status', 'completed')
        .gte('date', start)
        .lte('date', end)

      if (error) throw error

      const totals: Record<string, number> = {}
      for (const row of data ?? []) {
        totals[row.category] = (totals[row.category] ?? 0) + row.value
      }

      const total = Object.values(totals).reduce((s, v) => s + v, 0)
      if (total === 0) return mockCategoryData

      return Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({
          name,
          amount,
          value: Math.round((amount / total) * 100),
          color: CATEGORY_COLORS[name] ?? '#6B7280',
        }))
    } catch {
      return mockCategoryData
    }
  },

  async createRevenue(payload: Partial<Transaction>): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: 'revenue',
          description: payload.description,
          category: payload.category ?? 'Serviços',
          value: payload.value,
          date: payload.date ?? new Date().toISOString().split('T')[0],
          status: payload.status ?? 'completed',
        }])
        .select()
        .single()

      if (error) throw error
      return { ...data, id: String(data.id) }
    } catch {
      return { ...mockTransactions[0], ...payload, id: Date.now().toString() } as Transaction
    }
  },

  async createExpense(payload: Partial<Transaction>): Promise<Transaction> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: 'expense',
          description: payload.description,
          category: payload.category ?? 'Outros',
          value: payload.value,
          date: payload.date ?? new Date().toISOString().split('T')[0],
          status: payload.status ?? 'completed',
        }])
        .select()
        .single()

      if (error) throw error
      return { ...data, id: String(data.id) }
    } catch {
      return { ...mockTransactions[1], ...payload, id: Date.now().toString() } as Transaction
    }
  },
}

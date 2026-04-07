import { supabase } from '@/lib/supabase'
import type { DashboardMetrics, Transaction, ChartData, CategoryData } from '@/types'

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

async function getUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

// ── Empty states ──────────────────────────────────────────────────────────────

const emptyMetrics: DashboardMetrics = {
  monthRevenue: 0,
  annualRevenue: 0,
  monthExpenses: 0,
  netProfit: 0,
  meiLimit: 81000,
  meiUsed: 0,
  dasValue: 70.6,
  dasDueDate: '',
  monthRevenueGrowth: 0,
  monthExpensesGrowth: 0,
  netProfitGrowth: 0,
}

const emptyChartData: ChartData[] = MONTHS.map(month => ({
  month, receita: 0, despesa: 0, lucro: 0,
}))

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
        dasDueDate: das?.due_date ?? '',
        monthRevenueGrowth: 0,
        monthExpensesGrowth: 0,
        netProfitGrowth: netProfit > 0 && monthRevenue > 0
          ? Math.round((netProfit / monthRevenue) * 100)
          : 0,
      }
    } catch {
      return emptyMetrics
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
      return []
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
      return emptyChartData
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
      if (total === 0) return []

      return Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({
          name,
          amount,
          value: Math.round((amount / total) * 100),
          color: CATEGORY_COLORS[name] ?? '#6B7280',
        }))
    } catch {
      return []
    }
  },

  async createRevenue(payload: Partial<Transaction>): Promise<Transaction> {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
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
  },

  async createExpense(payload: Partial<Transaction>): Promise<Transaction> {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: userId,
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
  },
}

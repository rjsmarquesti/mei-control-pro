import { authFetch } from '@/lib/session'
import type { DashboardMetrics, Transaction, ChartData, CategoryData } from '@/types'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

const emptyChartData: ChartData[] = MONTHS.map(month => ({ month, receita: 0, despesa: 0, lucro: 0 }))

async function createTransaction(type: 'revenue' | 'expense', payload: Partial<Transaction>): Promise<Transaction> {
  const res = await authFetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      description: payload.description,
      category: payload.category,
      value: payload.value,
      date: payload.date ?? new Date().toISOString().split('T')[0],
      status: payload.status ?? 'completed',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Erro ao salvar lançamento')
  }
  return res.json()
}

export const financeService = {
  async getDashboard(): Promise<DashboardMetrics> {
    try {
      const res = await authFetch('/api/transactions/dashboard')
      if (!res.ok) return emptyMetrics
      return res.json()
    } catch {
      return emptyMetrics
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const res = await authFetch('/api/transactions?limit=20')
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  },

  async getChartData(): Promise<ChartData[]> {
    try {
      const res = await authFetch('/api/transactions/chart')
      if (!res.ok) return emptyChartData
      return res.json()
    } catch {
      return emptyChartData
    }
  },

  async getCategoryData(): Promise<CategoryData[]> {
    try {
      const res = await authFetch('/api/transactions/by-category')
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  },

  async createRevenue(payload: Partial<Transaction>): Promise<Transaction> {
    return createTransaction('revenue', payload)
  },

  async createExpense(payload: Partial<Transaction>): Promise<Transaction> {
    return createTransaction('expense', payload)
  },

  async updateTransaction(id: string, payload: Partial<Transaction>): Promise<Transaction> {
    const res = await authFetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Erro ao atualizar lançamento')
    }
    return res.json()
  },

  async deleteTransaction(id: string): Promise<void> {
    const res = await authFetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Erro ao excluir lançamento')
    }
  },
}

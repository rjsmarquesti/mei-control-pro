import { api } from './api'
import type { DashboardMetrics, Transaction, ChartData, CategoryData } from '@/types'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── Mock Data ────────────────────────────────────────────────────────────────

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

// ── Service Functions ────────────────────────────────────────────────────────

export const financeService = {
  async getDashboard(): Promise<DashboardMetrics> {
    try {
      const { data } = await api.get('/api/mei/dashboard')
      return data
    } catch {
      await delay(900)
      return mockMetrics
    }
  },

  async getTransactions(): Promise<Transaction[]> {
    try {
      const { data } = await api.get('/api/mei/transactions')
      return data
    } catch {
      await delay(700)
      return mockTransactions
    }
  },

  async getChartData(): Promise<ChartData[]> {
    try {
      const { data } = await api.get('/api/mei/chart-data')
      return data
    } catch {
      await delay(800)
      return mockChartData
    }
  },

  async getCategoryData(): Promise<CategoryData[]> {
    try {
      const { data } = await api.get('/api/mei/categories')
      return data
    } catch {
      await delay(600)
      return mockCategoryData
    }
  },

  async createRevenue(payload: Partial<Transaction>): Promise<Transaction> {
    try {
      const { data } = await api.post('/api/mei/revenues', payload)
      return data
    } catch {
      await delay(400)
      return { ...mockTransactions[0], ...payload, id: Date.now().toString() } as Transaction
    }
  },

  async createExpense(payload: Partial<Transaction>): Promise<Transaction> {
    try {
      const { data } = await api.post('/api/mei/expenses', payload)
      return data
    } catch {
      await delay(400)
      return { ...mockTransactions[1], ...payload, id: Date.now().toString() } as Transaction
    }
  },
}

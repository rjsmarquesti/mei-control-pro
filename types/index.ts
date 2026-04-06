export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  company: string
  meiSince: string
}

export interface Transaction {
  id: string
  date: string
  type: 'revenue' | 'expense'
  description: string
  category: string
  value: number
  status: 'completed' | 'pending' | 'cancelled'
}

export interface DashboardMetrics {
  monthRevenue: number
  annualRevenue: number
  monthExpenses: number
  netProfit: number
  meiLimit: number
  meiUsed: number
  dasValue: number
  dasDueDate: string
  monthRevenueGrowth: number
  monthExpensesGrowth: number
  netProfitGrowth: number
}

export interface ChartData {
  month: string
  receita: number
  despesa: number
  lucro: number
}

export interface CategoryData {
  name: string
  value: number
  color: string
  amount: number
}

export interface BrandSettings {
  primaryColor: string
  companyName: string
  logo?: string
  theme: 'light' | 'dark' | 'system'
  typography: string
}

export type Period = 'monthly' | 'annual'

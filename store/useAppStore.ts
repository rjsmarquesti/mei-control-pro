'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BrandSettings, User, DashboardMetrics, Transaction, ChartData, CategoryData, Period } from '@/types'

interface AppState {
  user: User | null
  metrics: DashboardMetrics | null
  transactions: Transaction[]
  chartData: ChartData[]
  categoryData: CategoryData[]
  isLoading: boolean
  brandSettings: BrandSettings
  selectedPeriod: Period

  setUser: (user: User) => void
  setMetrics: (metrics: DashboardMetrics) => void
  setTransactions: (transactions: Transaction[]) => void
  setChartData: (data: ChartData[]) => void
  setCategoryData: (data: CategoryData[]) => void
  setLoading: (loading: boolean) => void
  setBrandSettings: (settings: Partial<BrandSettings>) => void
  setSelectedPeriod: (period: Period) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      metrics: null,
      transactions: [],
      chartData: [],
      categoryData: [],
      isLoading: false,
      selectedPeriod: 'monthly',
      brandSettings: {
        primaryColor: '#7C3AED',
        companyName: 'MEI Control Pro',
        theme: 'dark',
        typography: 'Inter',
      },

      setUser: (user) => set({ user }),
      setMetrics: (metrics) => set({ metrics }),
      setTransactions: (transactions) => set({ transactions }),
      setChartData: (chartData) => set({ chartData }),
      setCategoryData: (categoryData) => set({ categoryData }),
      setLoading: (isLoading) => set({ isLoading }),
      setBrandSettings: (settings) =>
        set((state) => ({
          brandSettings: { ...state.brandSettings, ...settings },
        })),
      setSelectedPeriod: (selectedPeriod) => set({ selectedPeriod }),
    }),
    {
      name: 'mei-app-storage',
      partialize: (state) => ({ brandSettings: state.brandSettings }),
    }
  )
)

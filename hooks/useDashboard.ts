'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { financeService } from '@/services/finance'

export function useDashboard() {
  const {
    metrics,
    transactions,
    chartData,
    categoryData,
    isLoading,
    setMetrics,
    setTransactions,
    setChartData,
    setCategoryData,
    setLoading,
  } = useAppStore()

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const [metricsData, transactionsData, chartDataResult, categoryDataResult] =
          await Promise.all([
            financeService.getDashboard(),
            financeService.getTransactions(),
            financeService.getChartData(),
            financeService.getCategoryData(),
          ])

        setMetrics(metricsData)
        setTransactions(transactionsData)
        setChartData(chartDataResult)
        setCategoryData(categoryDataResult)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { metrics, transactions, chartData, categoryData, isLoading }
}

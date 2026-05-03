'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { financeService } from '@/services/finance'

export function useDashboard() {
  const {
    metrics,
    transactions,
    chartData,
    categoryData,
    isLoading,
    refreshKey,
    setMetrics,
    setTransactions,
    setChartData,
    setCategoryData,
    setLoading,
  } = useAppStore()

  const isFirstLoad = useRef(true)

  useEffect(() => {
    async function loadDashboard() {
      if (isFirstLoad.current) {
        setLoading(true)
        isFirstLoad.current = false
      }
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
  }, [refreshKey])

  return { metrics, transactions, chartData, categoryData, isLoading }
}

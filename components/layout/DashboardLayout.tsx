'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import { usePlan } from '@/hooks/usePlan'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { brandSettings } = useAppStore()
  const router = useRouter()
  useAuth()
  const { trialExpired, loading } = usePlan()

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', brandSettings.primaryColor)
  }, [brandSettings.primaryColor])

  useEffect(() => {
    if (!loading && trialExpired) {
      router.replace('/trial-expirado')
    }
  }, [loading, trialExpired, router])

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ height: '100dvh' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="px-4 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

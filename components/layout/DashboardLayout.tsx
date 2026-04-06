'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { brandSettings } = useAppStore()

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', brandSettings.primaryColor)
  }, [brandSettings.primaryColor])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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

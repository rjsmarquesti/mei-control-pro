'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, CreditCard, Target,
  Settings, LogOut, Menu, X, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/hooks/useAuth'

const nav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuários' },
  { href: '/admin/pagamentos', icon: CreditCard, label: 'Pagamentos' },
  { href: '/admin/leads', icon: Target, label: 'Leads' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Admin</p>
          <p className="text-[10px] text-blue-300">MEI Control Pro</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon size={17} />
                {item.label}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all">
            <LayoutDashboard size={17} />
            Ir para o App
          </div>
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-col shrink-0"
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 z-40"
          />
          <motion.aside
            initial={{ x: -256 }} animate={{ x: 0 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-56 z-50 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}
          >
            <SidebarContent />
          </motion.aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-white/10 bg-slate-900/80 backdrop-blur">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white">
            <Menu size={20} />
          </button>
          <p className="text-white font-semibold text-sm">Painel Administrativo</p>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

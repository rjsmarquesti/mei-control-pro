'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, Plus, BarChart3, User,
  Menu, X, ArrowDownLeft, ArrowUpRight, FileText,
  Receipt, Tag, CreditCard, ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const mainNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/financeiro', icon: TrendingUp, label: 'Financeiro' },
  { href: '/dashboard/receitas', icon: Plus, label: 'Novo', isFab: true },
  { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dashboard/perfil', icon: User, label: 'Perfil' },
]

const allNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/financeiro', icon: TrendingUp, label: 'Financeiro' },
  { href: '/dashboard/receitas', icon: ArrowDownLeft, label: 'Receitas' },
  { href: '/dashboard/despesas', icon: ArrowUpRight, label: 'Despesas' },
  { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dashboard/irpf', icon: FileText, label: 'IRPF Anual' },
  { href: '/dashboard/das', icon: Receipt, label: 'DAS & Impostos' },
  { href: '/dashboard/categorias', icon: Tag, label: 'Categorias' },
  { href: '/dashboard/assinatura', icon: CreditCard, label: 'Assinatura' },
  { href: '/dashboard/perfil', icon: User, label: 'Perfil' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { brandSettings } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Drawer overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border/60 bg-surface/95 backdrop-blur-xl pb-safe"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>

              <div className="px-4 pb-2 pt-1 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Menu</p>
                <button onClick={() => setMenuOpen(false)} className="btn-ghost !p-2 !rounded-xl">
                  <X size={18} />
                </button>
              </div>

              <div className="px-3 pb-8 space-y-0.5">
                {allNav.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
                    <motion.div
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
                        isActive(item.href) ? 'text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      style={isActive(item.href) ? { background: brandSettings.primaryColor } : {}}
                    >
                      <item.icon size={18} className="shrink-0" />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ChevronRight size={14} className="opacity-40" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-surface/90 backdrop-blur-xl pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {mainNav.map((item) => {
            const active = isActive(item.href)

            if (item.isFab) {
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-1 -mt-5">
                    <div
                      className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))`,
                        boxShadow: `0 8px 24px color-mix(in srgb, ${brandSettings.primaryColor} 40%, transparent)`,
                      }}
                    >
                      <item.icon size={22} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                  </motion.div>
                </Link>
              )
            }

            return (
              <Link key={item.href} href={item.href}>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-1 px-3 py-1">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center transition-colors"
                    style={active ? { background: `color-mix(in srgb, ${brandSettings.primaryColor} 20%, transparent)`, color: brandSettings.primaryColor } : {}}
                  >
                    <item.icon size={18} className={active ? '' : 'text-muted-foreground'} />
                  </div>
                  <span className={cn('text-[10px] font-medium', active ? 'text-foreground' : 'text-muted-foreground')}
                    style={active ? { color: brandSettings.primaryColor } : {}}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}

          {/* Mais button */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1 px-3 py-1">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Menu size={18} />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">Mais</span>
          </motion.button>
        </div>
      </nav>
    </>
  )
}

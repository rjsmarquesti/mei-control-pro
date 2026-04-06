'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, TrendingUp, Plus, BarChart3, User } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/financeiro', icon: TrendingUp, label: 'Financeiro' },
  { href: '/dashboard/receitas', icon: Plus, label: 'Novo', isFab: true },
  { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dashboard/perfil', icon: User, label: 'Perfil' },
]

export function MobileNav() {
  const pathname = usePathname()
  const { brandSettings } = useAppStore()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-surface/90 backdrop-blur-xl pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href

          if (item.isFab) {
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1 -mt-5"
                >
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
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
                    isActive ? 'text-white' : 'text-muted-foreground'
                  )}
                  style={isActive ? { background: `color-mix(in srgb, ${brandSettings.primaryColor} 20%, transparent)`, color: brandSettings.primaryColor } : {}}
                >
                  <item.icon size={18} />
                </div>
                <span
                  className={cn('text-[10px] font-medium transition-colors', isActive ? 'text-foreground' : 'text-muted-foreground')}
                  style={isActive ? { color: brandSettings.primaryColor } : {}}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

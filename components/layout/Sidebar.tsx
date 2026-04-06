'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileText,
  Receipt,
  Tag,
  CreditCard,
  User,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/financeiro', icon: TrendingUp, label: 'Financeiro' },
  { href: '/dashboard/receitas', icon: ArrowDownLeft, label: 'Receitas' },
  { href: '/dashboard/despesas', icon: ArrowUpRight, label: 'Despesas' },
  { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dashboard/irpf', icon: FileText, label: 'IRPF Anual', badge: 'NOVO' },
  { href: '/dashboard/das', icon: Receipt, label: 'DAS & Impostos' },
  { href: '/dashboard/categorias', icon: Tag, label: 'Categorias' },
]

const bottomItems = [
  { href: '/dashboard/assinatura', icon: CreditCard, label: 'Assinatura' },
  { href: '/dashboard/perfil', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { brandSettings, user } = useAppStore()

  const isActive = (href: string) => pathname === href

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border/60 bg-surface/80 backdrop-blur-xl z-30">
      {/* Logo */}
      <div className="p-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          {brandSettings.logo ? (
            <img src={brandSettings.logo} alt="Logo" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))` }}
            >
              {brandSettings.companyName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{brandSettings.companyName}</p>
            <p className="text-xs text-muted-foreground">MEI desde {user?.meiSince ?? '2023'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <motion.div
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn('sidebar-item', isActive(item.href) && 'active')}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                  {item.badge}
                </span>
              )}
              {isActive(item.href) && <ChevronRight size={14} className="shrink-0 opacity-70" />}
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="p-3 border-t border-border/60 space-y-0.5">
        {bottomItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <motion.div
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={cn('sidebar-item', isActive(item.href) && 'active')}
            >
              <item.icon size={18} className="shrink-0" />
              <span>{item.label}</span>
            </motion.div>
          </Link>
        ))}

        {/* Upgrade banner */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="mt-3 p-3 rounded-xl cursor-pointer"
          style={{
            background: `linear-gradient(135deg, color-mix(in srgb, ${brandSettings.primaryColor} 20%, transparent), color-mix(in srgb, ${brandSettings.primaryColor} 10%, transparent))`,
            border: `1px solid color-mix(in srgb, ${brandSettings.primaryColor} 30%, transparent)`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} style={{ color: brandSettings.primaryColor }} />
            <span className="text-xs font-semibold text-foreground">Plano Pro</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Acesso ilimitado a todos os recursos</p>
        </motion.div>
      </div>
    </aside>
  )
}

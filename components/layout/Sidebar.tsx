'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, ArrowDownLeft, ArrowUpRight,
  BarChart3, FileText, Receipt, Tag, CreditCard, User,
  ChevronRight, Lock, Sparkles,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { usePlan } from '@/hooks/usePlan'
import { cn } from '@/lib/utils'
import { type Plan } from '@/lib/plans'

const navItems: { href: string; icon: any; label: string; badge?: string; requiredPlan: Plan }[] = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard',      requiredPlan: 'free' },
  { href: '/dashboard/financeiro',   icon: TrendingUp,      label: 'Financeiro',     requiredPlan: 'basic' },
  { href: '/dashboard/receitas',     icon: ArrowDownLeft,   label: 'Receitas',       requiredPlan: 'free' },
  { href: '/dashboard/despesas',     icon: ArrowUpRight,    label: 'Despesas',       requiredPlan: 'free' },
  { href: '/dashboard/relatorios',   icon: BarChart3,       label: 'Relatórios',     requiredPlan: 'pro' },
  { href: '/dashboard/irpf',         icon: FileText,        label: 'IRPF Anual',     requiredPlan: 'premium', badge: 'NOVO' },
  { href: '/dashboard/das',          icon: Receipt,         label: 'DAS & Impostos', requiredPlan: 'pro' },
  { href: '/dashboard/categorias',   icon: Tag,             label: 'Categorias',     requiredPlan: 'basic' },
]

const bottomItems: { href: string; icon: any; label: string; requiredPlan: Plan }[] = [
  { href: '/dashboard/assinatura', icon: CreditCard, label: 'Assinatura', requiredPlan: 'free' },
  { href: '/dashboard/perfil',     icon: User,       label: 'Perfil',     requiredPlan: 'free' },
]

const PLAN_COLOR: Record<Plan, string> = {
  free: '#6B7280',
  basic: '#06B6D4',
  pro: '#7C3AED',
  premium: '#F59E0B',
}

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Gratuito',
  basic: 'Basic',
  pro: 'Pro',
  premium: 'Premium',
}

export function Sidebar() {
  const pathname = usePathname()
  const { brandSettings, user } = useAppStore()
  const { plan, hasAccess } = usePlan()

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
        {navItems.map((item) => {
          const allowed = hasAccess(item.requiredPlan)
          const active = isActive(item.href)

          if (!allowed) {
            return (
              <Link key={item.href} href="/dashboard/assinatura">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/50 cursor-pointer hover:bg-muted/50 transition-all">
                  <item.icon size={18} className="shrink-0" />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <Lock size={13} className="shrink-0 opacity-60" />
                </div>
              </Link>
            )
          }

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn('sidebar-item', active && 'active')}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                    {item.badge}
                  </span>
                )}
                {active && <ChevronRight size={14} className="shrink-0 opacity-70" />}
              </motion.div>
            </Link>
          )
        })}
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

        {/* Plan banner */}
        <Link href="/dashboard/assinatura">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="mt-3 p-3 rounded-xl cursor-pointer"
            style={{
              background: `color-mix(in srgb, ${PLAN_COLOR[plan]} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${PLAN_COLOR[plan]} 30%, transparent)`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} style={{ color: PLAN_COLOR[plan] }} />
              <span className="text-xs font-semibold text-foreground">Plano {PLAN_LABEL[plan]}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {plan === 'free' ? 'Faça upgrade para mais recursos' : 'Plano ativo'}
            </p>
          </motion.div>
        </Link>
      </div>
    </aside>
  )
}

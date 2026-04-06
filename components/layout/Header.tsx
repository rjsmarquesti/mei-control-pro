'use client'

import { useTheme } from 'next-themes'
import { motion } from 'framer-motion'
import { Sun, Moon, Bell, HelpCircle, ChevronDown, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getGreeting } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const YEARS = ['2023', '2024', '2025']

export function Header() {
  const { theme, setTheme } = useTheme()
  const { user, selectedPeriod, setSelectedPeriod, brandSettings, setBrandSettings } = useAppStore()
  const [mounted, setMounted] = useState(false)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [hasNotifications] = useState(3)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setBrandSettings({ theme: next as 'light' | 'dark' })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-surface/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16 gap-4">
        {/* Left: Greeting */}
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-base font-bold text-foreground truncate">
              {getGreeting()}, {user?.name ?? 'Usuário'}! 👋
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Aqui está seu resumo financeiro
            </p>
          </motion.div>
        </div>

        {/* Center: Search (desktop) */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/40 text-sm text-muted-foreground w-64 cursor-pointer hover:border-border transition-colors">
          <Search size={15} />
          <span className="flex-1 text-xs">Buscar receitas, despesas...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface font-mono">⌘K</kbd>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl border border-border/60 bg-muted/40">
            {(['monthly', 'annual'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={selectedPeriod === p
                  ? { background: brandSettings.primaryColor, color: 'white' }
                  : { color: 'hsl(var(--muted-foreground))' }
                }
              >
                {p === 'monthly' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 bg-muted/40 text-sm font-medium hover:bg-muted transition-colors"
            >
              {selectedYear}
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
            {showYearDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-1 w-24 glass-card-elevated border border-border shadow-glass-lg overflow-hidden z-50"
              >
                {YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => { setSelectedYear(y); setShowYearDropdown(false) }}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors font-medium"
                    style={selectedYear === y ? { color: brandSettings.primaryColor } : {}}
                  >
                    {y}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative !rounded-xl">
            <Bell size={18} />
            {hasNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: brandSettings.primaryColor }}>
                {hasNotifications}
              </span>
            )}
          </Button>

          {/* Help */}
          <Button variant="ghost" size="icon" className="!rounded-xl hidden sm:flex">
            <HelpCircle size={18} />
          </Button>

          {/* Theme toggle */}
          {mounted && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/60 bg-muted/40 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Sun size={14} className="dark:hidden text-amber-500" />
              <Moon size={14} className="hidden dark:block text-violet-400" />
              <span className="hidden sm:block">
                {theme === 'dark' ? 'Escuro' : 'Claro'}
              </span>
            </motion.button>
          )}

          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 cursor-pointer pl-2"
          >
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))`,
              }}
            >
              {user?.name?.charAt(0) ?? 'R'}
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold text-foreground leading-none">{user?.name ?? 'Rogério'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">MEI desde {user?.meiSince ?? '2023'}</p>
            </div>
            <ChevronDown size={14} className="text-muted-foreground hidden lg:block" />
          </motion.div>
        </div>
      </div>
    </header>
  )
}

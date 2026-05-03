'use client'

import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Bell, HelpCircle, ChevronDown, Search, LogOut, AlertTriangle, AlertCircle, Info, CheckCircle2, X, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/useAppStore'
import { getGreeting } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { signOut } from '@/hooks/useAuth'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'

const YEARS = ['2023', '2024', '2025']

const NOTIF_ICON: Record<string, any> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
}
const NOTIF_COLOR: Record<string, string> = {
  danger: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
  success: 'text-emerald-400',
}
const NOTIF_BG: Record<string, string> = {
  danger: 'bg-red-500/10',
  warning: 'bg-amber-500/10',
  info: 'bg-blue-500/10',
  success: 'bg-emerald-500/10',
}

export function Header() {
  const { theme, setTheme } = useTheme()
  const { user, selectedPeriod, setSelectedPeriod, brandSettings, setBrandSettings } = useAppStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedYear, setSelectedYear] = useState('2025')
  const [showYearDropdown, setShowYearDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const { results: searchResults, loading: searchLoading, search, clear: clearSearch } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    search(val)
  }, [search])

  const handleSearchSelect = (href: string) => {
    router.push(href)
    setSearchQuery('')
    clearSearch()
    setShowSearch(false)
  }

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        clearSearch()
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [clearSearch])

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => document.getElementById('global-search')?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        clearSearch()
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [clearSearch])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifClick = (n: AppNotification) => {
    markAllRead()
    setShowNotifications(false)
    if (n.href) router.push(n.href)
  }

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

        {/* Center: Search */}
        <div className="hidden md:block relative w-72" ref={searchRef}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-muted/40 hover:border-border transition-colors">
            {searchLoading
              ? <Loader2 size={15} className="text-muted-foreground animate-spin shrink-0" />
              : <Search size={15} className="text-muted-foreground shrink-0" />
            }
            <input
              id="global-search"
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowSearch(true)}
              placeholder="Buscar receitas, despesas..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchQuery ? (
              <button onClick={() => { setSearchQuery(''); clearSearch() }}>
                <X size={13} className="text-muted-foreground hover:text-foreground" />
              </button>
            ) : (
              <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface font-mono text-muted-foreground">⌘K</kbd>
            )}
          </div>

          <AnimatePresence>
            {showSearch && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-2 w-full glass-card-elevated border border-border shadow-glass-lg z-50 rounded-2xl overflow-hidden"
              >
                <div className="py-1 max-h-80 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSearchSelect(r.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Search size={13} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>
                      </div>
                      {r.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: `${r.badgeColor}20`, color: r.badgeColor }}>
                          {r.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative !rounded-xl"
              onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllRead() }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: '#EF4444' }}>
                  {unreadCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="fixed left-4 right-4 top-[72px] max-h-[60vh] overflow-y-auto sm:overflow-visible sm:max-h-none sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 glass-card-elevated border border-border shadow-glass-lg z-50 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <p className="text-sm font-bold text-foreground">Alertas</p>
                    <button onClick={() => setShowNotifications(false)} className="btn-ghost !p-1 !rounded-lg">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                    {notifications.map((n) => {
                      const Icon = NOTIF_ICON[n.type]
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${NOTIF_BG[n.type]}`}>
                            <Icon size={15} className={NOTIF_COLOR[n.type]} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground break-words">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-words">{n.message}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Help */}
          <a href="https://app.sismeipro.com.br/manual.html" target="_blank" rel="noopener noreferrer"
            title="Manual do usuário"
            className="hidden sm:flex items-center justify-center h-9 w-9 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <HelpCircle size={18} />
          </a>

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

          {/* Avatar + dropdown */}
          <div className="relative" ref={userMenuRef}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 cursor-pointer pl-2"
            >
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${brandSettings.primaryColor}, color-mix(in srgb, ${brandSettings.primaryColor} 70%, #06B6D4))`,
                }}
              >
                {user?.name?.charAt(0) ?? 'U'}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold text-foreground leading-none">{user?.name ?? 'Usuário'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{user?.email ?? ''}</p>
              </div>
              <ChevronDown size={14} className="text-muted-foreground hidden lg:block" />
            </motion.div>

            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-44 glass-card-elevated border border-border shadow-glass-lg overflow-hidden z-50 rounded-xl"
              >
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? 'Usuário'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email ?? ''}</p>
                </div>
                <button
                  onClick={() => { setShowUserMenu(false); signOut() }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} /> Sair
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

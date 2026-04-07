'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Target, CreditCard, TrendingUp, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/hooks/useAdmin'

interface Stats {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  totalLeads: number
  newLeads: number
  paidUsers: number
}

export default function AdminPage() {
  const { isAdmin, loading } = useAdmin()
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeUsers: 0, blockedUsers: 0, totalLeads: 0, newLeads: 0, paidUsers: 0 })
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentLeads, setRecentLeads] = useState<any[]>([])

  useEffect(() => {
    if (!isAdmin) return
    loadData()
  }, [isAdmin])

  const loadData = async () => {
    const [usersRes, leadsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('updated_at', { ascending: false }),
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
    ])

    const users = usersRes.data ?? []
    const leads = leadsRes.data ?? []

    setStats({
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status !== 'blocked' && u.status !== 'suspended').length,
      blockedUsers: users.filter(u => u.status === 'blocked' || u.status === 'suspended').length,
      totalLeads: leads.length,
      newLeads: leads.filter(l => l.status === 'novo').length,
      paidUsers: users.filter(u => u.subscription_plan !== 'free').length,
    })
    setRecentUsers(users.slice(0, 5))
    setRecentLeads(leads)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin text-blue-400" />
    </div>
  )

  const cards = [
    { label: 'Total de Usuários', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Usuários Ativos', value: stats.activeUsers, icon: UserCheck, color: 'bg-green-500' },
    { label: 'Bloqueados/Suspensos', value: stats.blockedUsers, icon: UserX, color: 'bg-red-500' },
    { label: 'Total de Leads', value: stats.totalLeads, icon: Target, color: 'bg-violet-500' },
    { label: 'Leads Novos', value: stats.newLeads, icon: TrendingUp, color: 'bg-amber-500' },
    { label: 'Assinantes Pagos', value: stats.paidUsers, icon: CreditCard, color: 'bg-cyan-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
          >
            <div className={`h-8 w-8 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h2 className="text-sm font-bold text-white mb-4">Usuários Recentes</h2>
          <div className="space-y-2">
            {recentUsers.length === 0 && <p className="text-xs text-slate-500">Nenhum usuário ainda</p>}
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">{u.name ?? 'Sem nome'}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  u.status === 'blocked' ? 'bg-red-500/20 text-red-400' :
                  u.status === 'suspended' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {u.status === 'blocked' ? 'Bloqueado' : u.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent leads */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h2 className="text-sm font-bold text-white mb-4">Leads Recentes</h2>
          <div className="space-y-2">
            {recentLeads.length === 0 && <p className="text-xs text-slate-500">Nenhum lead ainda</p>}
            {recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <p className="text-sm font-medium text-white">{l.name}</p>
                  <p className="text-xs text-slate-400">{l.phone} · {l.city}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  l.status === 'convertido' ? 'bg-green-500/20 text-green-400' :
                  l.status === 'contatado' ? 'bg-blue-500/20 text-blue-400' :
                  l.status === 'perdido' ? 'bg-red-500/20 text-red-400' :
                  'bg-violet-500/20 text-violet-400'
                }`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

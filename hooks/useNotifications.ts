'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type NotifType = 'danger' | 'warning' | 'info' | 'success'

export interface AppNotification {
  id: string
  type: NotifType
  title: string
  message: string
  href?: string
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const userId = session.user.id
      const list: AppNotification[] = []

      // 1. DAS overdue
      const { data: overdueDas } = await supabase
        .from('das_payments')
        .select('id, due_date, value')
        .eq('user_id', userId)
        .eq('status', 'overdue')

      if (overdueDas && overdueDas.length > 0) {
        list.push({
          id: 'das-overdue',
          type: 'danger',
          title: `DAS em atraso (${overdueDas.length}x)`,
          message: `Você tem ${overdueDas.length} guia(s) DAS em atraso. Regularize para evitar multas.`,
          href: '/dashboard/das',
          read: false,
        })
      }

      // 2. DAS due in next 15 days — alertas em 15, 7 e 1 dia
      const in15 = new Date()
      in15.setDate(in15.getDate() + 15)
      const { data: pendingDas } = await supabase
        .from('das_payments')
        .select('id, due_date, value')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .lte('due_date', in15.toISOString().split('T')[0])
        .order('due_date', { ascending: true })

      if (pendingDas && pendingDas.length > 0) {
        const d = new Date(pendingDas[0].due_date + 'T12:00:00')
        const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        const formatted = d.toLocaleDateString('pt-BR')
        const isUrgent = diffDays <= 1
        list.push({
          id: 'das-due-soon',
          type: isUrgent ? 'danger' : 'warning',
          title: isUrgent ? '⚠️ DAS vence HOJE!' : `DAS vence em ${diffDays} dia(s)`,
          message: `Sua guia DAS vence em ${formatted}. ${isUrgent ? 'Pague agora para evitar multa.' : 'Não esqueça de pagar.'}`,
          href: '/dashboard/das',
          read: false,
        })
      }

      // 3. MEI limit — soma receitas do ano corrente
      const currentYear = new Date().getFullYear()
      const { data: revenues } = await supabase
        .from('transactions')
        .select('value')
        .eq('user_id', userId)
        .eq('type', 'revenue')
        .gte('date', `${currentYear}-01-01`)
        .lte('date', `${currentYear}-12-31`)

      const MEI_LIMIT = 81000
      const annualRevenue = (revenues ?? []).reduce((s, t) => s + (t.value ?? 0), 0)
      const pct = (annualRevenue / MEI_LIMIT) * 100

      if (pct >= 95) {
        list.push({
          id: 'mei-limit-critical',
          type: 'danger',
          title: 'Limite MEI crítico!',
          message: `Você atingiu ${pct.toFixed(0)}% do limite anual de R$ 81.000. Risco de perda do MEI.`,
          href: '/dashboard/financeiro',
          read: false,
        })
      } else if (pct >= 75) {
        list.push({
          id: 'mei-limit-warning',
          type: 'warning',
          title: `${pct.toFixed(0)}% do limite MEI`,
          message: `Faturamento anual em R$ ${annualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Fique atento ao limite.`,
          href: '/dashboard/financeiro',
          read: false,
        })
      }

      // 4. Subscription expiring within 5 days
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_expires_at')
        .eq('id', userId)
        .single()

      if (profile?.subscription_expires_at && profile.subscription_plan !== 'free') {
        const exp = new Date(profile.subscription_expires_at)
        const now = new Date()
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 0) {
          list.push({
            id: 'plan-expired',
            type: 'danger',
            title: 'Plano expirado',
            message: 'Sua assinatura expirou. Renove para continuar com acesso completo.',
            href: '/dashboard/assinatura',
            read: false,
          })
        } else if (diffDays <= 5) {
          list.push({
            id: 'plan-expiring',
            type: 'warning',
            title: `Plano expira em ${diffDays} dia(s)`,
            message: 'Renove sua assinatura para não perder o acesso aos recursos.',
            href: '/dashboard/assinatura',
            read: false,
          })
        }
      }

      // 5. Pending transactions
      const { data: pending } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (pending && pending.length > 0) {
        list.push({
          id: 'pending-transactions',
          type: 'info',
          title: `${pending.length} lançamento(s) pendente(s)`,
          message: 'Você tem lançamentos aguardando confirmação.',
          href: '/dashboard/receitas',
          read: false,
        })
      }

      // 6. Welcome / no data
      if (list.length === 0) {
        list.push({
          id: 'all-good',
          type: 'success',
          title: 'Tudo em dia!',
          message: 'Nenhuma pendência encontrada. Continue assim!',
          read: false,
        })
      }

      setNotifications(list)
      setLoading(false)
    }

    load()
  }, [])

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })))
  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, markAllRead, loading }
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type NotifType = 'danger' | 'warning' | 'info' | 'success'
interface AppNotification { id: string; type: NotifType; title: string; message: string; href?: string; read: boolean }

const MEI_LIMIT = 81000

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req)
  if (!userId) return NextResponse.json([])

  const list: AppNotification[] = []
  const currentYear = new Date().getFullYear()
  const in15 = new Date()
  in15.setDate(in15.getDate() + 15)

  const [overdueDas, pendingDas, revenues, user, pendingTx] = await Promise.all([
    prisma.dasPayment.findMany({ where: { userId, status: 'overdue' }, select: { id: true } }),
    prisma.dasPayment.findMany({ where: { userId, status: 'pending', dueDate: { lte: in15 } }, orderBy: { dueDate: 'asc' } }),
    prisma.transaction.aggregate({ where: { userId, type: 'revenue', date: { gte: new Date(`${currentYear}-01-01`), lte: new Date(`${currentYear}-12-31`) } }, _sum: { value: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { subscriptionPlan: true, subscriptionExpiresAt: true } }),
    prisma.transaction.findMany({ where: { userId, status: 'pending' }, select: { id: true } }),
  ])

  if (overdueDas.length > 0) {
    list.push({
      id: 'das-overdue', type: 'danger',
      title: `DAS em atraso (${overdueDas.length}x)`,
      message: `Você tem ${overdueDas.length} guia(s) DAS em atraso. Regularize para evitar multas.`,
      href: '/dashboard/das', read: false,
    })
  }

  if (pendingDas.length > 0) {
    const d = pendingDas[0].dueDate
    const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const formatted = d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    const isUrgent = diffDays <= 1
    list.push({
      id: 'das-due-soon', type: isUrgent ? 'danger' : 'warning',
      title: isUrgent ? '⚠️ DAS vence HOJE!' : `DAS vence em ${diffDays} dia(s)`,
      message: `Sua guia DAS vence em ${formatted}. ${isUrgent ? 'Pague agora para evitar multa.' : 'Não esqueça de pagar.'}`,
      href: '/dashboard/das', read: false,
    })
  }

  const annualRevenue = Number(revenues._sum.value ?? 0)
  const pct = (annualRevenue / MEI_LIMIT) * 100

  if (pct >= 95) {
    list.push({
      id: 'mei-limit-critical', type: 'danger',
      title: 'Limite MEI crítico!',
      message: `Você atingiu ${pct.toFixed(0)}% do limite anual de R$ 81.000. Risco de perda do MEI.`,
      href: '/dashboard/financeiro', read: false,
    })
  } else if (pct >= 75) {
    list.push({
      id: 'mei-limit-warning', type: 'warning',
      title: `${pct.toFixed(0)}% do limite MEI`,
      message: `Faturamento anual em R$ ${annualRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Fique atento ao limite.`,
      href: '/dashboard/financeiro', read: false,
    })
  }

  if (user?.subscriptionExpiresAt && user.subscriptionPlan !== 'free') {
    const diffDays = Math.ceil((user.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) {
      list.push({ id: 'plan-expired', type: 'danger', title: 'Plano expirado', message: 'Sua assinatura expirou. Renove para continuar com acesso completo.', href: '/dashboard/assinatura', read: false })
    } else if (diffDays <= 5) {
      list.push({ id: 'plan-expiring', type: 'warning', title: `Plano expira em ${diffDays} dia(s)`, message: 'Renove sua assinatura para não perder o acesso aos recursos.', href: '/dashboard/assinatura', read: false })
    }
  }

  if (pendingTx.length > 0) {
    list.push({
      id: 'pending-transactions', type: 'info',
      title: `${pendingTx.length} lançamento(s) pendente(s)`,
      message: 'Você tem lançamentos aguardando confirmação.',
      href: '/dashboard/receitas', read: false,
    })
  }

  if (list.length === 0) {
    list.push({ id: 'all-good', type: 'success', title: 'Tudo em dia!', message: 'Nenhuma pendência encontrada. Continue assim!', read: false })
  }

  return NextResponse.json(list)
}

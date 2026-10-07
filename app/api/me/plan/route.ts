export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ plan: 'free', expires_at: null, is_trial: false, status: 'active' })

    const data = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true, subscriptionExpiresAt: true, isTrial: true, status: true, trialActivatedAt: true },
    })

    if (!data) return NextResponse.json({ plan: 'free', expires_at: null, is_trial: false, status: 'active' })

    const expires = data.subscriptionExpiresAt
    const status = data.status ?? 'active'

    // Trial expirado: plano free, status trial_expired
    const trialExpired =
      status === 'trial_expired' ||
      (data.isTrial && expires && expires < new Date())

    const rawPlan = trialExpired ? 'free' : (data.subscriptionPlan ?? 'free')
    const VALID_PLANS = ['free', 'basic', 'pro', 'premium']
    const plan = VALID_PLANS.includes(rawPlan) ? rawPlan : 'premium'

    const isTrial = data.isTrial ?? false
    const trialEligible = !isTrial && plan === 'free' && !data.trialActivatedAt && status !== 'trial_expired'

    return NextResponse.json({
      plan,
      expires_at: expires?.toISOString() ?? null,
      is_trial: isTrial,
      status: trialExpired ? 'trial_expired' : status,
      trial_eligible: trialEligible,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[POST /api/me/plan]', msg)
    return NextResponse.json({ plan: 'free', expires_at: null, is_trial: false, status: 'active' })
  }
}

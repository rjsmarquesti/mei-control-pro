export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getUserFromRequest } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ plan: 'free', expires_at: null, is_trial: false, status: 'active' })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_expires_at, is_trial, status')
      .eq('id', userId)
      .single()

    if (error || !data) return NextResponse.json({ plan: 'free', expires_at: null, is_trial: false, status: 'active' })

    const expires = data.subscription_expires_at
    const status = data.status ?? 'active'

    // Trial expirado: plano free, status trial_expired
    const trialExpired =
      status === 'trial_expired' ||
      (data.is_trial && expires && new Date(expires) < new Date())

    const rawPlan = trialExpired ? 'free' : (data.subscription_plan ?? 'free')
    const VALID_PLANS = ['free', 'basic', 'pro', 'premium']
    const plan = VALID_PLANS.includes(rawPlan) ? rawPlan : 'premium'

    return NextResponse.json({
      plan,
      expires_at: expires ?? null,
      is_trial: data.is_trial ?? false,
      status: trialExpired ? 'trial_expired' : status,
    })
  } catch (e: any) {
    console.error('[POST /api/me/plan]', e.message)
    return NextResponse.json({ plan: 'free', expires_at: null, is_trial: false, status: 'active' })
  }
}

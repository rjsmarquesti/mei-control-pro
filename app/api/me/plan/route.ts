export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, getUserFromRequest } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserFromRequest(req)
    if (!userId) return NextResponse.json({ plan: 'free', expires_at: null })

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_expires_at')
      .eq('id', userId)
      .single()

    if (error || !data) return NextResponse.json({ plan: 'free', expires_at: null })

    const expires = data.subscription_expires_at
    const isExpired = expires ? new Date(expires) < new Date() : false
    const rawPlan = isExpired ? 'free' : (data.subscription_plan ?? 'free')
    const VALID_PLANS = ['free', 'basic', 'pro', 'premium']
    const plan = VALID_PLANS.includes(rawPlan) ? rawPlan : 'premium'

    return NextResponse.json({ plan, expires_at: expires ?? null })
  } catch (e: any) {
    console.error('[POST /api/me/plan]', e.message)
    return NextResponse.json({ plan: 'free', expires_at: null })
  }
}

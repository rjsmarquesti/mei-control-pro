'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { type Plan, hasAccess, getRequiredPlanForRoute } from '@/lib/plans'

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_expires_at')
        .eq('id', session.user.id)
        .single()

      if (data) {
        const expires = data.subscription_expires_at
        const isExpired = expires ? new Date(expires) < new Date() : false
        const activePlan: Plan = (isExpired ? 'free' : data.subscription_plan) as Plan
        setPlan(activePlan ?? 'free')
      }

      setLoading(false)
    })
  }, [])

  const can = (route: string) => hasAccess(plan, getRequiredPlanForRoute(route))

  return { plan, loading, can, hasAccess: (required: Plan) => hasAccess(plan, required) }
}

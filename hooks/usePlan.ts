'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { type Plan, hasAccess, getRequiredPlanForRoute } from '@/lib/plans'

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }

      try {
        // Use service-role API — bypasses RLS, always returns correct plan
        const res = await fetch('/api/me/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({}),
        })
        const json = await res.json()
        setPlan((json.plan as Plan) ?? 'free')
        setExpiresAt(json.expires_at ?? null)
      } catch {
        // fallback: read directly from Supabase (may be subject to RLS)
        const { data } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_expires_at')
          .eq('id', session.user.id)
          .single()

        if (data) {
          const expires = data.subscription_expires_at
          const isExpired = expires ? new Date(expires) < new Date() : false
          setPlan((isExpired ? 'free' : data.subscription_plan) as Plan ?? 'free')
          setExpiresAt(expires ?? null)
        }
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const can = (route: string) => hasAccess(plan, getRequiredPlanForRoute(route))

  return { plan, expiresAt, loading, can, hasAccess: (required: Plan) => hasAccess(plan, required) }
}

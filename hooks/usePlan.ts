'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { type Plan, hasAccess, getRequiredPlanForRoute, isTrialExpired, trialDaysLeft } from '@/lib/plans'

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isTrial, setIsTrial] = useState(false)
  const [status, setStatus] = useState<string>('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }

      try {
        const res = await fetch('/api/me/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({}),
        })
        const json = await res.json()
        setPlan((json.plan as Plan) ?? 'free')
        setExpiresAt(json.expires_at ?? null)
        setIsTrial(json.is_trial ?? false)
        setStatus(json.status ?? 'active')
      } catch {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_expires_at, is_trial, status')
          .eq('id', session.user.id)
          .single()

        if (data) {
          const expires = data.subscription_expires_at
          const trial = data.is_trial ?? false
          const st = data.status ?? 'active'
          const expired = isTrialExpired({ is_trial: trial, subscription_expires_at: expires, status: st })
          setPlan((expired ? 'free' : data.subscription_plan) as Plan ?? 'free')
          setExpiresAt(expires ?? null)
          setIsTrial(trial)
          setStatus(expired ? 'trial_expired' : st)
        }
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const trialExpired = isTrialExpired({ is_trial: isTrial, subscription_expires_at: expiresAt, status })
  const daysLeft = isTrial ? trialDaysLeft(expiresAt) : null
  const can = (route: string) => hasAccess(plan, getRequiredPlanForRoute(route))

  return {
    plan,
    expiresAt,
    isTrial,
    status,
    trialExpired,
    daysLeft,
    loading,
    can,
    hasAccess: (required: Plan) => hasAccess(plan, required),
  }
}

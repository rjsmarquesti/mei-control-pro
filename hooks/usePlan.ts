'use client'

import { useEffect, useState } from 'react'
import { authFetch, getAccessToken } from '@/lib/session'
import { type Plan, hasAccess, getRequiredPlanForRoute, isTrialExpired, trialDaysLeft } from '@/lib/plans'

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('free')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isTrial, setIsTrial] = useState(false)
  const [status, setStatus] = useState<string>('active')
  const [trialEligible, setTrialEligible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return }

    authFetch('/api/me/plan', { method: 'POST' })
      .then(async (res) => {
        const json = await res.json()
        setPlan((json.plan as Plan) ?? 'free')
        setExpiresAt(json.expires_at ?? null)
        setIsTrial(json.is_trial ?? false)
        setStatus(json.status ?? 'active')
        setTrialEligible(json.trial_eligible ?? false)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
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
    trialEligible,
    daysLeft,
    loading,
    can,
    hasAccess: (required: Plan) => hasAccess(plan, required),
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.sismeipro.com.br'

const PLAN_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, premium: 3 }

const PLAN_PRICES: Record<string, { title: string; price: number; months: number }> = {
  basic:          { title: 'MEI Control Pro — Plano Basic',          price: 19.90,  months: 1  },
  pro:            { title: 'MEI Control Pro — Plano Pro',            price: 39.90,  months: 1  },
  premium:        { title: 'MEI Control Pro — Plano Premium',        price: 59.90,  months: 1  },
  basic_annual:   { title: 'MEI Control Pro — Plano Basic Anual (20% OFF)',   price: 191.04, months: 12 },
  pro_annual:     { title: 'MEI Control Pro — Plano Pro Anual (20% OFF)',     price: 382.56, months: 12 },
  premium_annual: { title: 'MEI Control Pro — Plano Premium Anual (20% OFF)', price: 574.08, months: 12 },
}

export async function POST(req: NextRequest) {
  try {
    const authenticatedId = await getUserFromRequest(req)
    if (!authenticatedId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { plan } = await req.json()
    const userId = authenticatedId

    if (!MP_TOKEN) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
    }

    const planConfig = PLAN_PRICES[plan]
    if (!planConfig) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    // Bloquear downgrade: buscar plano atual e comparar com o solicitado
    const isAnnual = plan.endsWith('_annual')
    const targetPlan = isAnnual ? plan.replace('_annual', '') : plan
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, subscriptionPlan: true, subscriptionExpiresAt: true },
    })
    const currentPlan = profile?.subscriptionPlan ?? 'free'
    const planActive = profile?.subscriptionExpiresAt && profile.subscriptionExpiresAt > new Date()
    if (planActive && (PLAN_RANK[targetPlan] ?? 0) < (PLAN_RANK[currentPlan] ?? 0)) {
      return NextResponse.json({ error: 'Não é possível fazer downgrade do plano atual' }, { status: 400 })
    }

    const mp = new MercadoPagoConfig({ accessToken: MP_TOKEN })
    const preference = new Preference(mp)

    const result = await preference.create({
      body: {
        items: [{
          id: plan,
          title: planConfig.title,
          quantity: 1,
          unit_price: planConfig.price,
          currency_id: 'BRL',
        }],
        payer: { email: profile?.email },
        external_reference: `${userId}|${plan}`,
        back_urls: {
          success: `${APP_URL}/dashboard/assinatura?status=success&plan=${plan}`,
          failure: `${APP_URL}/dashboard/assinatura?status=failure`,
          pending: `${APP_URL}/dashboard/assinatura?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${APP_URL}/api/webhook/mercadopago`,
        statement_descriptor: 'MEI CONTROL PRO',
      },
    })

    return NextResponse.json({ url: result.init_point })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[checkout]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

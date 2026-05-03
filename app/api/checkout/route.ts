import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { getUserFromRequest } from '@/lib/supabase-server'

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.sismeipro.com.br'

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

    const { plan, userEmail } = await req.json()
    const userId = authenticatedId

    if (!MP_TOKEN) {
      return NextResponse.json({ error: 'Mercado Pago não configurado' }, { status: 500 })
    }

    const planConfig = PLAN_PRICES[plan]
    if (!planConfig) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
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
        payer: { email: userEmail },
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
  } catch (err: any) {
    console.error('[checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

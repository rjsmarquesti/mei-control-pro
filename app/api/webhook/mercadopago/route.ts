import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { upgradeTenantPlan, logAuditEvent, getTenantByUserId, type TenantPlan } from '@/lib/tenant'

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN ?? ''
const MP_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? ''

function validateMPSignature(req: NextRequest, rawBody: string): boolean {
  if (!MP_WEBHOOK_SECRET) return true // sem secret configurado, não bloqueia

  const xSignature = req.headers.get('x-signature') ?? ''
  const xRequestId = req.headers.get('x-request-id') ?? ''

  const tsMatch = xSignature.match(/ts=([^,]+)/)
  const v1Match = xSignature.match(/v1=([^,]+)/)
  if (!tsMatch || !v1Match) return false

  const ts = tsMatch[1]
  const v1 = v1Match[1]

  // Extrai data.id do body para compor o manifesto
  let dataId = ''
  try { dataId = JSON.parse(rawBody)?.data?.id ?? '' } catch { /* ignore */ }

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`
  const expected = createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex')
  return expected === v1
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    if (!validateMPSignature(req, rawBody)) {
      console.error('[webhook/mercadopago] Assinatura inválida')
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }

    const body = JSON.parse(rawBody)

    // Mercado Pago sends a notification with type and data.id
    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    if (!body.data?.id) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    if (!MP_TOKEN) {
      return NextResponse.json({ error: 'Não configurado' }, { status: 503 })
    }

    const mp = new MercadoPagoConfig({ accessToken: MP_TOKEN })
    const paymentClient = new Payment(mp)
    const payment = await paymentClient.get({ id: body.data.id })

    if (payment.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    // external_reference = "userId|plan"
    const [userId, rawPlan] = (payment.external_reference ?? '').split('|')
    if (!userId || !rawPlan) {
      return NextResponse.json({ error: 'Referência inválida' }, { status: 400 })
    }

    // Normaliza _annual → plano base; define duração correta
    const isAnnual = rawPlan.endsWith('_annual')
    const plan = isAnnual ? rawPlan.replace('_annual', '') : rawPlan

    const expires = new Date()
    expires.setDate(expires.getDate() + (isAnnual ? 365 : 30))

    // Atualiza profile — trigger sincroniza tenant + features + JWT automaticamente
    const { ok, error } = await upgradeTenantPlan(userId, plan as TenantPlan, expires.toISOString())
    if (!ok) {
      console.error('[webhook] Erro ao atualizar plano:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    // Log de auditoria do pagamento
    const tenant = await getTenantByUserId(userId)
    if (tenant) {
      await logAuditEvent({
        tenantId:   tenant.id,
        userId,
        action:     'payment_approved',
        resource:   'subscription',
        resourceId: String(payment.id),
        newData:    { plan, expires_at: expires.toISOString(), payment_id: payment.id },
        metadata:   { mp_status: payment.status, amount: payment.transaction_amount },
      })
    }

    console.log(`[webhook] Plano ${plan} ativado para ${userId}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[webhook/mercadopago]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Mercado Pago also sends GET to validate the webhook URL
export async function GET() {
  return NextResponse.json({ ok: true })
}

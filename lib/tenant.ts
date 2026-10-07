/**
 * Helpers de plano/assinatura do MEI Control Pro.
 *
 * Nota: o conceito de "tenant" separado (tabelas tenants/tenant_features do
 * Supabase antigo) foi descontinuado na migração pra Prisma — nunca era lido
 * por nenhuma rota, só escrito por triggers de banco. Plano e status vivem
 * direto em User.
 */
import { prisma } from '@/lib/prisma'

export type TenantPlan = 'free' | 'basic' | 'pro' | 'premium' | 'super_premium'

/**
 * Atualiza o plano de um usuário. Chame após confirmar pagamento (webhook MercadoPago).
 */
export async function upgradeTenantPlan(
  userId: string,
  plan: TenantPlan,
  expiresAt: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionPlan: plan, subscriptionExpiresAt: new Date(expiresAt) },
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro desconhecido' }
  }
}

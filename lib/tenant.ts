/**
 * Helpers de multi-tenant para o MEI Control Pro.
 * Lê tenant_id e features diretamente do JWT (app_metadata) — sem queries extras.
 */

import { getServiceClient } from '@/lib/supabase-server'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TenantPlan = 'free' | 'basic' | 'pro' | 'premium' | 'enterprise'
export type TenantStatus = 'active' | 'suspended' | 'cancelled' | 'trial'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  status: TenantStatus
  owner_id: string
  max_users: number
  billing_email: string | null
  billing_cycle: 'monthly' | 'yearly'
  trial_ends_at: string | null
  subscription_expires_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface TenantFeature {
  feature_key: string
  enabled: boolean
  config: Record<string, unknown>
}

// Features disponíveis no sistema
export const FEATURES = {
  DASHBOARD:      'dashboard',
  RECEITAS:       'receitas',
  DESPESAS:       'despesas',
  DAS:            'das',
  CATEGORIAS:     'categorias',
  FINANCEIRO:     'financeiro',
  DAS_ALERTS:     'das_alerts',
  RELATORIOS:     'relatorios',
  IRPF:           'irpf',
  WHATSAPP_NOTIF: 'whatsapp_notif',
  EXPORT_PDF:     'export_pdf',
  API_ACCESS:     'api_access',
  MULTI_CNPJ:     'multi_cnpj',
} as const

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES]

// ── Extração do JWT ───────────────────────────────────────────────────────────

/**
 * Extrai tenant_id do JWT do usuário (app_metadata).
 * Use em API routes onde o token é passado via Authorization header.
 */
export function getTenantIdFromJwt(jwtPayload: Record<string, unknown>): string | null {
  const appMeta = jwtPayload.app_metadata as Record<string, string> | undefined
  return appMeta?.tenant_id ?? null
}

/**
 * Extrai tenant_plan do JWT do usuário (app_metadata).
 */
export function getTenantPlanFromJwt(jwtPayload: Record<string, unknown>): TenantPlan {
  const appMeta = jwtPayload.app_metadata as Record<string, string> | undefined
  return (appMeta?.tenant_plan as TenantPlan) ?? 'free'
}

// ── Operações server-side (service role) ─────────────────────────────────────

/**
 * Busca o tenant de um usuário pelo userId.
 * Use em API routes server-side.
 */
export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', userId)
    .single()

  if (error || !data) return null
  return data as Tenant
}

/**
 * Busca as features de um tenant.
 */
export async function getTenantFeatures(tenantId: string): Promise<TenantFeature[]> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('tenant_features')
    .select('feature_key, enabled, config')
    .eq('tenant_id', tenantId)

  if (error || !data) return []
  return data as TenantFeature[]
}

/**
 * Verifica se um tenant tem uma feature específica habilitada.
 */
export async function tenantHasFeature(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('tenant_features')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('feature_key', featureKey)
    .single()

  return data?.enabled === true
}

/**
 * Atualiza o plano de um tenant e sincroniza o app_metadata do usuário.
 * Chame após confirmar pagamento (webhook MercadoPago).
 */
export async function upgradeTenantPlan(
  userId: string,
  plan: TenantPlan,
  expiresAt: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient()

  // 1. Atualizar profile (trigger cuida do tenant automaticamente)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ subscription_plan: plan, subscription_expires_at: expiresAt })
    .eq('id', userId)

  if (profileError) return { ok: false, error: profileError.message }

  return { ok: true }
}

/**
 * Registra uma ação no log de auditoria (server-side via service role).
 */
export async function logAuditEvent(params: {
  tenantId: string
  userId: string
  action: string
  resource?: string
  resourceId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = getServiceClient()
  await supabase.from('logs').insert({
    tenant_id:   params.tenantId,
    user_id:     params.userId,
    action:      params.action,
    resource:    params.resource,
    resource_id: params.resourceId,
    old_data:    params.oldData,
    new_data:    params.newData,
    metadata:    params.metadata ?? {},
  })
}

// ── Limites por plano ─────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<TenantPlan, { maxUsers: number; maxCnpj: number }> = {
  free:       { maxUsers: 1,    maxCnpj: 1  },
  basic:      { maxUsers: 3,    maxCnpj: 1  },
  pro:        { maxUsers: 10,   maxCnpj: 2  },
  premium:    { maxUsers: 9999, maxCnpj: 3  },
  enterprise: { maxUsers: 9999, maxCnpj: 99 },
}

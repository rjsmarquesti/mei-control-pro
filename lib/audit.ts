/**
 * Funções de auditoria de segurança — escrevem na tabela imutável audit_logs.
 * Nenhuma rota deve expor update/delete para essa tabela (convenção de aplicação).
 */
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export interface AuditEventParams {
  userId: string
  action: string
  entity_type?: string
  entity_id?: string
  before_data?: Record<string, unknown>
  after_data?: Record<string, unknown>
  ip?: string | null
  user_agent?: string | null
}

/**
 * Registra evento de segurança na trilha de auditoria imutável.
 * Falha silenciosa — nunca deve bloquear a operação principal.
 */
export async function logSecurityEvent(params: AuditEventParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entity_type ?? null,
        entityId: params.entity_id ?? null,
        beforeData: (params.before_data ?? undefined) as Prisma.InputJsonValue | undefined,
        afterData: (params.after_data ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: params.ip ?? null,
        userAgent: params.user_agent ?? null,
      },
    })
  } catch (err) {
    console.error('[audit] Falha ao registrar evento:', params.action, err)
  }
}

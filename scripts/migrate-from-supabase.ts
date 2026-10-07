/**
 * Migração one-shot: Supabase self-hosted (schema `sismei` + `auth.users`) → Postgres próprio via Prisma.
 *
 * Preserva os UUIDs originais de auth.users como id de User — todas as FKs
 * (user_id em transactions, das_payments, map_leads etc.) continuam válidas sem remapeamento.
 * A senha (bcrypt) é copiada 1:1 de auth.users.encrypted_password — usuários não precisam resetar senha.
 *
 * Uso:
 *   OLD_DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@<host>:5432/postgres" \
 *   DATABASE_URL="postgres://.../sismei_novo" \
 *   npm run migrate:supabase
 *
 * OLD_DATABASE_URL precisa do usuário `postgres` (superuser) — schema `auth` não é
 * legível pelo role `service_role` fora do PostgREST.
 */
import { Client } from 'pg'
import { prisma } from '../lib/prisma'

async function main() {
  const oldUrl = process.env.OLD_DATABASE_URL
  if (!oldUrl) throw new Error('OLD_DATABASE_URL não definida')

  const old = new Client({ connectionString: oldUrl })
  await old.connect()

  try {
    await migrateUsers(old)
    await migrateTransactions(old)
    await migrateCategories(old)
    await migrateDasPayments(old)
    await migrateSystemSettings(old)
    await migrateLeads(old)
    await migrateCrmNotes(old)
    await migrateMapLeadNichos(old)
    await migrateMapLeads(old)
    await migrateConsents(old)
    await migrateAuditLogs(old)
    await migrateLgpdRequests(old)
    await migrateActivations(old, 'sismei.activations', 'activation')
    await migrateActivations(old, 'sismei.elet_activations', 'eletActivation')
    console.log('✅ Migração concluída com sucesso.')
  } finally {
    await old.end()
    await prisma.$disconnect()
  }
}

async function migrateUsers(old: Client) {
  const { rows } = await old.query(`
    SELECT
      u.id, u.email, u.encrypted_password, u.email_confirmed_at,
      p.name, p.phone, p.city, p.company, p.cnpj, p.activity, p.mei_since,
      p.role, p.status, p.subscription_plan, p.subscription_expires_at,
      p.das_multa_pct, p.das_juros_pct, p.last_seen_at, p.lifecycle_notified,
      p.is_trial, p.trial_activated_at, p.created_at, p.updated_at
    FROM auth.users u
    JOIN sismei.profiles p ON p.id = u.id
  `)

  for (const r of rows) {
    await prisma.user.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        email: r.email,
        passwordHash: r.encrypted_password,
        name: r.name,
        phone: r.phone,
        city: r.city,
        company: r.company,
        cnpj: r.cnpj,
        activity: r.activity,
        meiSince: r.mei_since,
        role: r.role ?? 'user',
        status: r.status ?? 'active',
        subscriptionPlan: r.subscription_plan ?? 'free',
        subscriptionExpiresAt: r.subscription_expires_at,
        dasMultaPct: r.das_multa_pct ?? 2.0,
        dasJurosPct: r.das_juros_pct ?? 1.0,
        lastSeenAt: r.last_seen_at,
        lifecycleNotified: r.lifecycle_notified ?? {},
        isTrial: r.is_trial ?? false,
        trialActivatedAt: r.trial_activated_at,
        emailConfirmedAt: r.email_confirmed_at,
        createdAt: r.created_at ?? new Date(),
        updatedAt: r.updated_at ?? new Date(),
      },
      update: {},
    })
  }
  console.log(`users: ${rows.length}`)
}

async function migrateTransactions(old: Client) {
  const { rows } = await old.query(`SELECT id, user_id, type, description, category, value, date, status, created_at FROM sismei.transactions`)
  for (const r of rows) {
    await prisma.transaction.upsert({
      where: { id: BigInt(r.id) },
      create: {
        id: BigInt(r.id), userId: r.user_id, type: r.type, description: r.description,
        category: r.category, value: r.value, date: r.date, status: r.status, createdAt: r.created_at,
      },
      update: {},
    })
  }
  console.log(`transactions: ${rows.length}`)
}

async function migrateCategories(old: Client) {
  const { rows } = await old.query(`SELECT id, user_id, name, type, color, created_at FROM sismei.categories`)
  for (const r of rows) {
    await prisma.category.upsert({
      where: { id: r.id },
      create: { id: r.id, userId: r.user_id, name: r.name, type: r.type, color: r.color, createdAt: r.created_at },
      update: {},
    })
  }
  console.log(`categories: ${rows.length}`)
}

async function migrateDasPayments(old: Client) {
  const { rows } = await old.query(`SELECT id, user_id, value, due_date, status, competencia, paid_at, created_at FROM sismei.das_payments`)
  for (const r of rows) {
    await prisma.dasPayment.upsert({
      where: { id: BigInt(r.id) },
      create: {
        id: BigInt(r.id), userId: r.user_id, value: r.value, dueDate: r.due_date,
        status: r.status, competencia: r.competencia, paidAt: r.paid_at, createdAt: r.created_at,
      },
      update: {},
    })
  }
  console.log(`das_payments: ${rows.length}`)
}

async function migrateSystemSettings(old: Client) {
  const { rows } = await old.query(`SELECT key, value, label, updated_at FROM sismei.system_settings`)
  for (const r of rows) {
    await prisma.systemSetting.upsert({
      where: { key: r.key },
      create: { key: r.key, value: r.value, label: r.label, updatedAt: r.updated_at },
      update: { value: r.value, label: r.label, updatedAt: r.updated_at },
    })
  }
  console.log(`system_settings: ${rows.length}`)
}

async function migrateLeads(old: Client) {
  const { rows } = await old.query(`SELECT id, name, email, phone, city, status, notes, created_at, updated_at FROM sismei.leads`)
  for (const r of rows) {
    await prisma.lead.upsert({
      where: { id: r.id },
      create: {
        id: r.id, name: r.name, email: r.email, phone: r.phone, city: r.city,
        status: r.status, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
      },
      update: {},
    })
  }
  console.log(`leads: ${rows.length}`)
}

async function migrateCrmNotes(old: Client) {
  const { rows } = await old.query(`SELECT id, contact_id, contact_type, content, interaction_type, created_at FROM sismei.crm_notes`)
  for (const r of rows) {
    await prisma.crmNote.upsert({
      where: { id: BigInt(r.id) },
      create: {
        id: BigInt(r.id), contactId: r.contact_id, contactType: r.contact_type,
        content: r.content, interactionType: r.interaction_type, createdAt: r.created_at,
      },
      update: {},
    })
  }
  console.log(`crm_notes: ${rows.length}`)
}

async function migrateMapLeadNichos(old: Client) {
  const { rows } = await old.query(`SELECT id, nicho, categorias, emoji, ordem FROM sismei.map_lead_nichos`)
  for (const r of rows) {
    await prisma.mapLeadNicho.upsert({
      where: { id: r.id },
      create: { id: r.id, nicho: r.nicho, categorias: r.categorias ?? [], emoji: r.emoji, ordem: r.ordem },
      update: {},
    })
  }
  console.log(`map_lead_nichos: ${rows.length}`)
}

async function migrateMapLeads(old: Client) {
  const { rows } = await old.query(`SELECT * FROM sismei.map_leads`)
  for (const r of rows) {
    await prisma.mapLead.upsert({
      where: { id: r.id },
      create: {
        id: r.id, userId: r.user_id, businessName: r.business_name, phone: r.phone, phone2: r.phone2,
        email: r.email, website: r.website, rating: r.rating, reviewsCount: r.reviews_count ?? 0,
        googleMapsUrl: r.google_maps_url, placeId: r.place_id, estado: r.estado, municipio: r.municipio,
        cidade: r.cidade, bairro: r.bairro, cep: r.cep, logradouro: r.logradouro, numero: r.numero,
        complemento: r.complemento, latitude: r.latitude, longitude: r.longitude, nicho: r.nicho,
        categoria: r.categoria, subcategoria: r.subcategoria, tags: r.tags ?? [], status: r.status,
        priority: r.priority, notes: r.notes, ultimoContato: r.ultimo_contato, proximoContato: r.proximo_contato,
        fonte: r.fonte, createdAt: r.created_at, updatedAt: r.updated_at,
      },
      update: {},
    })
  }
  console.log(`map_leads: ${rows.length}`)
}

async function migrateConsents(old: Client) {
  const { rows } = await old.query(`SELECT id, user_id, terms_version, privacy_version, ip, user_agent, accepted_at FROM sismei.consents`)
  for (const r of rows) {
    await prisma.consent.upsert({
      where: { id: r.id },
      create: {
        id: r.id, userId: r.user_id, termsVersion: r.terms_version, privacyVersion: r.privacy_version,
        ip: r.ip, userAgent: r.user_agent, acceptedAt: r.accepted_at,
      },
      update: {},
    })
  }
  console.log(`consents: ${rows.length}`)
}

async function migrateAuditLogs(old: Client) {
  const { rows } = await old.query(`SELECT id, user_id, action, entity_type, entity_id, before_data, after_data, ip, user_agent, created_at FROM sismei.audit_logs`)
  for (const r of rows) {
    await prisma.auditLog.upsert({
      where: { id: r.id },
      create: {
        id: r.id, userId: r.user_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id,
        beforeData: r.before_data ?? undefined, afterData: r.after_data ?? undefined,
        ip: r.ip, userAgent: r.user_agent, createdAt: r.created_at,
      },
      update: {},
    })
  }
  console.log(`audit_logs: ${rows.length}`)
}

async function migrateLgpdRequests(old: Client) {
  const { rows } = await old.query(`SELECT id, user_id, type, status, requested_at, completed_at, notes FROM sismei.lgpd_requests`)
  for (const r of rows) {
    await prisma.lgpdRequest.upsert({
      where: { id: r.id },
      create: {
        id: r.id, userId: r.user_id, type: r.type, status: r.status,
        requestedAt: r.requested_at, completedAt: r.completed_at, notes: r.notes,
      },
      update: {},
    })
  }
  console.log(`lgpd_requests: ${rows.length}`)
}

async function migrateActivations(old: Client, table: string, model: 'activation' | 'eletActivation') {
  const { rows } = await old.query(`SELECT id, email, activated_at, last_verified_at, revoked, revoked_at, revoke_reason FROM ${table}`)
  for (const r of rows) {
    const data = {
      id: r.id, email: r.email, activatedAt: r.activated_at, lastVerifiedAt: r.last_verified_at,
      revoked: r.revoked, revokedAt: r.revoked_at, revokeReason: r.revoke_reason,
    }
    if (model === 'activation') {
      await prisma.activation.upsert({ where: { id: r.id }, create: data, update: {} })
    } else {
      await prisma.eletActivation.upsert({ where: { id: r.id }, create: data, update: {} })
    }
  }
  console.log(`${table}: ${rows.length}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

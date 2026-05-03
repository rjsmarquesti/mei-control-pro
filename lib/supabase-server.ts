/**
 * Cliente Supabase para uso server-side (API routes).
 * Usa SERVICE_ROLE_KEY (bypassa RLS) + schema sismei.
 *
 * Importe em todas as API routes no lugar do createClient inline.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!url || !key) {
  console.error('[supabase-server] Env vars ausentes: SUPABASE_URL ou SERVICE_ROLE_KEY')
}

/**
 * Retorna cliente com service_role + schema sismei.
 * Use para todas as operações admin/server-side do MEI Control Pro.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceClient(): SupabaseClient<any, any, any> {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db:   { schema: 'sismei' },
  })
}

/**
 * Verifica o Bearer token do header Authorization e retorna o userId autenticado.
 * Retorna null se o token for inválido ou ausente.
 */
export async function getUserFromRequest(req: import('next/server').NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null

  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user } } = await client.auth.getUser()
  return user?.id ?? null
}

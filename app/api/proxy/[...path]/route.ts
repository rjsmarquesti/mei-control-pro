import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const search = req.nextUrl.search
  const targetUrl = `${SUPABASE_URL}/${path}${search}`

  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
  }

  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    headers['Authorization'] = authHeader
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_KEY}`
  }

  const preferHeader = req.headers.get('Prefer')
  if (preferHeader) headers['Prefer'] = preferHeader

  const rangeHeader = req.headers.get('Range')
  if (rangeHeader) headers['Range'] = rangeHeader

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text()
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const data = await response.text()

  return new NextResponse(data, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
    },
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler

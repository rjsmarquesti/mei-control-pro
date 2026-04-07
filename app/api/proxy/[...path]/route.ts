import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/')
    const search = req.nextUrl.search
    const targetUrl = `${SUPABASE_URL}/${path}${search}`

    const headers: Record<string, string> = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }

    const contentType = req.headers.get('Content-Type')
    if (contentType) headers['Content-Type'] = contentType

    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader !== `Bearer ${SUPABASE_KEY}`) {
      headers['Authorization'] = authHeader
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
      body: body || undefined,
    })

    const responseText = await response.text()

    // Handle empty responses (e.g. 204 No Content)
    if (!responseText) {
      return new NextResponse(null, { status: response.status })
    }

    const responseContentType = response.headers.get('Content-Type') ?? 'application/json'

    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': responseContentType,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Proxy error' }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler

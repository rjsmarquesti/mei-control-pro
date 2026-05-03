export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'das_default_value')
      .single()

    if (error || !data) return NextResponse.json({ das_default_value: '70.60' })
    return NextResponse.json({ das_default_value: data.value })
  } catch {
    return NextResponse.json({ das_default_value: '70.60' })
  }
}

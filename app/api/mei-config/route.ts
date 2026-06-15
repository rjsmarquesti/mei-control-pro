export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-server'

const FALLBACK = {
  valorDAS: 75.90,
  limiteAnualMEI: 81000,
  tabelaIRPF: [
    { limite: 22847.76, aliquota: 0, deducao: 0 },
    { limite: 33919.80, aliquota: 0.075, deducao: 1713.58 },
    { limite: 45012.60, aliquota: 0.15, deducao: 4257.57 },
    { limite: 55976.16, aliquota: 0.225, deducao: 7633.51 },
    { limite: 999999999, aliquota: 0.275, deducao: 10432.32 },
  ],
}

export async function GET() {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['das_default_value', 'mei_limite_anual', 'irpf_tabela'])

    if (error || !data) return NextResponse.json(FALLBACK)

    const map: Record<string, string> = {}
    data.forEach(row => { map[row.key] = row.value })

    let tabelaIRPF = FALLBACK.tabelaIRPF
    if (map['irpf_tabela']) {
      try { tabelaIRPF = JSON.parse(map['irpf_tabela']) } catch { /* usa fallback */ }
    }

    return NextResponse.json({
      valorDAS: map['das_default_value'] ? parseFloat(map['das_default_value']) : FALLBACK.valorDAS,
      limiteAnualMEI: map['mei_limite_anual'] ? parseFloat(map['mei_limite_anual']) : FALLBACK.limiteAnualMEI,
      tabelaIRPF,
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return NextResponse.json(FALLBACK)
  }
}

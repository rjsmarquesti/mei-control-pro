export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'das_default_value' } })
    return NextResponse.json({ das_default_value: setting?.value ?? '70.60' })
  } catch {
    return NextResponse.json({ das_default_value: '70.60' })
  }
}

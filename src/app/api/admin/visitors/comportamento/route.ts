import { NextRequest, NextResponse } from 'next/server'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { ESCOPO_TUDO } from '@/lib/visitors/escopo'
import { consultarComportamento } from '@/lib/visitors/consultas/comportamento'

// O corpo mora em src/lib/visitors/consultas/comportamento.ts: a mesma consulta serve à área da agência,
// com o escopo dela (spec 2026-10-02-area-agencia). Aqui é o painel da Attra.
export async function GET(request: NextRequest) {
  try {
    const admin = await adminComAcessoA('/admin/visitors')
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const r = await consultarComportamento(request.url, ESCOPO_TUDO)
    return NextResponse.json(r)
  } catch (error) {
    console.error('[Visitors Comportamento API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

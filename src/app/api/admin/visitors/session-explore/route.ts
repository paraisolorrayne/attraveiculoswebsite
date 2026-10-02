import { NextRequest, NextResponse } from 'next/server'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { ESCOPO_TUDO } from '@/lib/visitors/escopo'
import { consultarSessaoDetalhe } from '@/lib/visitors/consultas/sessao-detalhe'

// O corpo mora em src/lib/visitors/consultas/sessao-detalhe.ts: a mesma consulta serve à área da agência,
// com o escopo dela (spec 2026-10-02-area-agencia). Aqui é o painel da Attra.
export async function GET(request: NextRequest) {
  try {
    const admin = await adminComAcessoA('/admin/visitors')
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const r = await consultarSessaoDetalhe(request.url, ESCOPO_TUDO)
    if ('erro' in r) return NextResponse.json({ error: r.mensagem }, { status: r.erro })
    return NextResponse.json(r)
  } catch (error) {
    console.error('[Session Explore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

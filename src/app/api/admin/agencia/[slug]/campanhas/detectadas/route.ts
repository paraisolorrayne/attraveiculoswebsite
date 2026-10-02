import { NextRequest, NextResponse } from 'next/server'
import { acessoAgencia } from '@/lib/auth/guard-agencia'
import { campanhasDetectadas } from '@/lib/agencias/campanhas-db'

/** Visitas com a marca da agência que ainda não casam com campanha cadastrada. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const acesso = await acessoAgencia((await params).slug)
	if (!acesso.ok) return NextResponse.json({ error: 'Forbidden' }, { status: acesso.status })
	try {
		return NextResponse.json({ detectadas: await campanhasDetectadas(acesso.agencia.id) })
	} catch (error) {
		console.error('[Agencia Campanhas API] detectadas:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

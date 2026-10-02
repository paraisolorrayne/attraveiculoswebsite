import { NextRequest, NextResponse } from 'next/server'
import { acessoAgencia } from '@/lib/auth/guard-agencia'
import { atualizarCampanha } from '@/lib/agencias/campanhas-db'

/** Edita ou encerra (`{ encerrar: true }`) uma campanha da própria agência. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
	const { slug, id } = await params
	const acesso = await acessoAgencia(slug)
	if (!acesso.ok) return NextResponse.json({ error: 'Forbidden' }, { status: acesso.status })
	try {
		const corpo = await request.json().catch(() => null)
		const r = await atualizarCampanha(acesso.agencia.id, acesso.admin.id, id, corpo)
		if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })
		return NextResponse.json({ id: r.id })
	} catch (error) {
		console.error('[Agencia Campanhas API] PATCH:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

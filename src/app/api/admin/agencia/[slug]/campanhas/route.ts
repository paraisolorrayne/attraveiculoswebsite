import { NextRequest, NextResponse } from 'next/server'
import { acessoAgencia } from '@/lib/auth/guard-agencia'
import { criarCampanha, listarCampanhas } from '@/lib/agencias/campanhas-db'

/**
 * Campanhas da agência do login (spec 2026-10-02). GET lista com as visitas do
 * período; POST cadastra — vale na hora, e a trava entre agências é do banco.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const acesso = await acessoAgencia((await params).slug)
	if (!acesso.ok) return NextResponse.json({ error: 'Forbidden' }, { status: acesso.status })
	try {
		return NextResponse.json(await listarCampanhas(acesso.agencia.id, request.url))
	} catch (error) {
		console.error('[Agencia Campanhas API] GET:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const acesso = await acessoAgencia((await params).slug)
	if (!acesso.ok) return NextResponse.json({ error: 'Forbidden' }, { status: acesso.status })
	try {
		const corpo = await request.json().catch(() => null)
		const r = await criarCampanha(acesso.agencia.id, acesso.admin.id, corpo)
		if (!r.ok) return NextResponse.json({ error: r.erro }, { status: r.status })
		return NextResponse.json({ id: r.id }, { status: 201 })
	} catch (error) {
		console.error('[Agencia Campanhas API] POST:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute, isAdminRole } from '@/lib/auth/roles'
import { idDoVeiculo, registrarCriativo } from '@/lib/criativos-gerados'

export const dynamic = 'force-dynamic'

// POST: o botão "Já tem" da tela inicial. Marca o carro como já tendo criativo
// quando a peça foi feita fora do gerador (ou antes de este registro existir).
export async function POST(request: NextRequest) {
	const admin = await getCurrentAdmin()
	if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	const role = isAdminRole(admin.role) ? admin.role : 'gerente'
	if (!canAccessRoute(role, '/admin/gerador-criativos', admin.secoes)) {
		return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
	}

	const corpo = await request.json().catch(() => null)
	const autoconfId = idDoVeiculo(corpo?.autoconf_id)
	if (!autoconfId) return NextResponse.json({ error: 'autoconf_id inválido' }, { status: 400 })

	try {
		await registrarCriativo({
			autoconfId,
			nome: typeof corpo?.nome === 'string' ? corpo.nome.slice(0, 200) : null,
			origem: 'manual',
			por: { id: admin.id, nome: admin.name || admin.email.split('@')[0] },
		})
		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error('[criativos-gerados] POST falhou:', error)
		return NextResponse.json({ error: 'Não foi possível marcar o carro' }, { status: 500 })
	}
}

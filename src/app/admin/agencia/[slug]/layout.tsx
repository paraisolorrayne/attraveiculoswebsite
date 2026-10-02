import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { acessoAgencia } from '@/lib/auth/guard-agencia'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { AgenciaShell } from './agencia-shell'

export const dynamic = 'force-dynamic'

/**
 * Área da agência (spec 2026-10-02-area-agencia). Quem entra é decidido aqui,
 * no servidor: usuário `agencia` com slug de outra agência volta para a dele;
 * o time da Attra vê qualquer uma, com um seletor no topo.
 */
export default async function AgenciaLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
	const { slug } = await params
	const acesso = await acessoAgencia(slug)
	if (!acesso.ok) {
		if (acesso.status === 401) redirect('/admin/login')
		if (acesso.status === 404) notFound()
		const admin = await getCurrentAdmin()
		redirect(admin?.role === 'agencia' && admin.agencia ? `/admin/agencia/${admin.agencia.slug}` : '/admin')
	}

	const ehAttra = acesso.admin.role !== 'agencia'
	const agencias = ehAttra ? await db.selectFrom('agencias').select(['slug', 'nome']).orderBy('nome').execute() : []

	return (
		<AgenciaShell agencia={acesso.agencia} ehAttra={ehAttra} agencias={agencias}>
			{children}
		</AgenciaShell>
	)
}

import { db } from '@/lib/db'
import { getCurrentAdmin, type AdminUser } from '@/lib/admin-auth-supabase'
import { canAccessRoute, isAdminRole, type AdminRole, type SecoesExtras } from './roles'

export interface AgenciaResumo {
	id: string
	slug: string
	nome: string
}

/**
 * Quem pode ver a área de uma agência (spec 2026-10-02-area-agencia).
 *
 * Usuário `agencia` vê SÓ a dele — o slug da URL nunca decide por ele, e
 * exceção de seção não vale. O time da Attra segue a matriz de papéis
 * (admin, owner e operador entram; marketing e gerente, não).
 */
export function podeVerAgencia(
	admin: { role: AdminRole; agencia: { id: string } | null; secoes: SecoesExtras },
	agenciaId: string,
): boolean {
	if (admin.role === 'agencia') return admin.agencia?.id === agenciaId
	return canAccessRoute(admin.role, '/admin/agencia', admin.secoes)
}

export async function acessoAgencia(
	slug: string,
): Promise<{ ok: true; admin: AdminUser; agencia: AgenciaResumo } | { ok: false; status: 401 | 403 | 404 }> {
	const admin = await getCurrentAdmin()
	if (!admin) return { ok: false, status: 401 }
	const agencia = await db
		.selectFrom('agencias')
		.select(['id', 'slug', 'nome'])
		.where('slug', '=', slug)
		.executeTakeFirst()
	if (!agencia) return { ok: false, status: 404 }
	const role: AdminRole = isAdminRole(admin.role) ? admin.role : 'gerente'
	if (!podeVerAgencia({ role, agencia: admin.agencia, secoes: admin.secoes }, agencia.id)) {
		return { ok: false, status: 403 }
	}
	return { ok: true, admin, agencia }
}

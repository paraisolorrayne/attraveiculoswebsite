/**
 * Último acesso de verdade ao admin — não só o último login.
 *
 * `last_login_at` só muda quando a pessoa digita a senha, e a sessão do
 * Auth.js se renova sozinha enquanto ela usa o painel: em 29/09 a tela de
 * Usuários mostrava 03/08 para quem entrava todo dia. `ultimo_acesso_em` é
 * gravado a cada visita autenticada (via getCurrentAdmin), no máximo uma vez
 * por INTERVALO_ACESSO_MS por pessoa, para não virar uma escrita por request.
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'

export const INTERVALO_ACESSO_MS = 5 * 60 * 1000

export function deveRegistrarAcesso(ultimo: Date | string | null, agora: Date = new Date()): boolean {
	if (ultimo == null) return true
	const t = ultimo instanceof Date ? ultimo.getTime() : new Date(ultimo).getTime()
	if (!Number.isFinite(t)) return true
	return agora.getTime() - t >= INTERVALO_ACESSO_MS
}

/**
 * Grava o acesso. Fire-and-forget: falhar aqui nunca pode barrar a entrada no
 * painel. A condição repetida no WHERE cobre duas abas pedindo ao mesmo tempo.
 * Não mexe em `updated_at`, que é da edição do cadastro.
 */
export function registrarAcesso(adminId: string): void {
	db.updateTable('admin_users')
		.set({ ultimo_acesso_em: sql`now()` })
		.where('id', '=', adminId)
		.where(eb =>
			eb.or([
				eb('ultimo_acesso_em', 'is', null),
				eb('ultimo_acesso_em', '<', sql<Date>`now() - ${`${INTERVALO_ACESSO_MS / 1000} seconds`}::interval`),
			]),
		)
		.execute()
		.catch(e => console.error('[auth] ultimo_acesso update failed:', e))
}

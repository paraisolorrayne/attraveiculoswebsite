import type { AdminRole } from './roles'

/**
 * Agência que fica gravada no usuário, conforme o papel.
 *
 * Papel `agencia` sem agência seria um login que não abre nada (o guard só
 * libera a agência do vínculo); nos outros papéis o vínculo é apagado, para
 * que trocar alguém de "Agência" para "Marketing" não deixe um resto que volte
 * a valer se o papel mudar de novo.
 */
export function agenciaDoUsuario(
	role: AdminRole,
	agenciaId: unknown,
	existentes: string[],
): { ok: true; agencia_id: string | null } | { ok: false; erro: string } {
	if (role !== 'agencia') return { ok: true, agencia_id: null }
	if (typeof agenciaId !== 'string' || !agenciaId.trim()) return { ok: false, erro: 'Escolha a agência deste usuário' }
	if (!existentes.includes(agenciaId)) return { ok: false, erro: 'Agência não encontrada' }
	return { ok: true, agencia_id: agenciaId }
}

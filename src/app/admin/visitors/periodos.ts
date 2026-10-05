/**
 * Períodos do painel de Visitantes e da área da agência. Nas consultas, "1 dia"
 * é a janela corrida de 24 h (`agora − 24 h`, ver periodoDaUrl), não "hoje
 * desde a meia-noite" — por isso o rótulo aqui não é o "Hoje" do CRM.
 */

// Os mesmos valores de sql-atribuicao.ts (o teste confere). Repetidos aqui para
// este arquivo, que roda no navegador, não puxar o Kysely para o pacote.
export const DIAS_PADRAO = 30
export const DIAS_MAX = 730

export const PERIODOS_VISITANTES = [
	{ dias: 1, label: 'Últimas 24 h' },
	{ dias: 7, label: 'Semana (7d)' },
	{ dias: 15, label: 'Quinzena (15d)' },
	{ dias: 30, label: 'Mês (30d)' },
	{ dias: 0, label: 'Tudo' },
] as const

/** `dias` da URL. 0 ("Tudo") é valor de verdade; ausente ou inválido vira o padrão. */
export function diasDaUrl(valor: string | null, padrao = DIAS_PADRAO): number {
	if (valor === null || valor.trim() === '') return padrao
	const n = Number(valor)
	return Number.isInteger(n) && n >= 0 && n <= DIAS_MAX ? n : padrao
}

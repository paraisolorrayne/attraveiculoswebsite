/**
 * Frescor — as datas que dizem a buscadores e assistentes de IA "isto é de
 * agora".
 *
 * Existe porque, até 26/08/2026, todo `lastmod` das páginas estáticas era a
 * hora do build e a ficha de veículo não dizia quando o anúncio entrou nem
 * quando a disponibilidade foi conferida. Para uma pergunta como "Porsche 911
 * à venda", um assistente de IA prefere a página que diz de quando é — e um
 * lastmod que muda a cada build sem o conteúdo mudar é ruído que o Google
 * aprende a ignorar.
 *
 * Regras:
 *   - Página que lista estoque: lastmod = publicação mais recente entre os
 *     veículos listados (muda quando entra carro novo, não a cada build).
 *   - Página de conteúdo fixo: lastmod = LASTMOD_CONTEUDO_ESTATICO, uma data
 *     que se atualiza à mão quando o texto muda de verdade.
 *   - Nunca `new Date()` como lastmod.
 */

/**
 * Última alteração real de conteúdo nas páginas fixas (institucionais, guias,
 * páginas de intenção). ATUALIZE ao mexer no texto dessas páginas — é o único
 * jeito de o sitemap contar a verdade sobre elas.
 *
 * 26/08/2026: parágrafos-resposta nas páginas de intenção (AEO).
 */
export const LASTMOD_CONTEUDO_ESTATICO = '2026-08-26T12:00:00.000Z'

/** dd/mm/aaaa no fuso de Brasília; null para entrada inválida. */
export function formatarDataBR(iso: string | null | undefined): string | null {
	if (!iso) return null
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return null
	return new Intl.DateTimeFormat('pt-BR', {
		timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
	}).format(d)
}

/** A mais recente entre várias datas ISO; ignora ausentes e inválidas. */
export function dataMaisRecente(datas: Array<string | null | undefined>): string | null {
	let melhor: { iso: string; t: number } | null = null
	for (const iso of datas) {
		if (!iso) continue
		const t = new Date(iso).getTime()
		if (Number.isNaN(t)) continue
		if (!melhor || t > melhor.t) melhor = { iso, t }
	}
	return melhor ? new Date(melhor.t).toISOString() : null
}

/**
 * lastmod de uma página que lista estoque: a publicação mais nova entre os
 * veículos. Sem veículo com data, cai no lastmod estático — nunca em now().
 */
export function lastmodDoEstoque(veiculos: Array<{ updated_at?: string | null }>): string {
	return dataMaisRecente(veiculos.map(v => v.updated_at)) ?? LASTMOD_CONTEUDO_ESTATICO
}

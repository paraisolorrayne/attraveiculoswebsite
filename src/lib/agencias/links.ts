/**
 * Links dentro da área da agência. Os painéis de Visitantes geram caminhos no
 * formato do painel da Attra ("/origens", "/campanha/x", "/sessoes/<id>");
 * aqui eles viram as rotas da área da agência.
 *
 * "/sessoes/<id>" é o DETALHE de uma sessão; "/sessoes" e "/sessoes?…" são a
 * LISTA (aba de Visitantes) — no painel da Attra os dois moram sob o mesmo
 * prefixo, na área da agência não.
 */
export function linkDaAgencia(slug: string, caminho: string): string {
	const base = `/admin/agencia/${slug}`
	if (caminho.startsWith('/campanha/')) return base + caminho
	if (/^\/sessoes\/[^/?#]+/.test(caminho)) return base + caminho
	if (caminho === '' || caminho === '/') return `${base}/visitantes/visao-geral`
	return `${base}/visitantes${caminho}`
}

/** Acrescenta os filtros da área ao link, sem sobrescrever o que ele já traz. */
export function comFiltros(url: string, filtros: Record<string, string | undefined>): string {
	const [caminho, query = ''] = url.split('?')
	const q = new URLSearchParams(query)
	for (const [k, v] of Object.entries(filtros)) if (v && !q.has(k)) q.set(k, v)
	const s = q.toString()
	return s ? `${caminho}?${s}` : caminho
}

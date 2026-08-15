/**
 * Eventos das páginas de marca, modelo e categoria (item 26 do spec).
 *
 * Aqui só se MONTA o payload — nada de `window`, nada de React. O disparo mora
 * em `<AnalyticsMarca>`; esta camada é pura para poder ser testada sem DOM, que
 * é onde os erros de analytics costumam passar despercebidos: evento com nome
 * errado ou parâmetro faltando não quebra a página, só apaga o dado, e ninguém
 * descobre até alguém pedir o relatório três meses depois.
 *
 * O que estes eventos respondem, e o resto do GA4 não: de qual página de marca
 * veio o clique. `view_vehicle` já existe, mas dispara na página do veículo,
 * quando a origem já se perdeu. `source_page` viaja junto no clique justamente
 * para separar "a Ferrari que /ferrari entregou" de "a Ferrari que
 * /superesportivos entregou".
 *
 * UTM não é montada aqui: `pushEvent` já enriquece qualquer evento com
 * utm_source/medium/campaign a partir do VisitorContext. Duplicar seria criar
 * uma segunda fonte de verdade para o mesmo dado.
 */

export type TipoDePagina = 'marca' | 'modelo' | 'categoria'

export interface ContextoDaPagina {
	tipo: TipoDePagina
	/** Nome de exibição, não slug: o relatório é lido por gente. */
	marca?: string | null
	modelo?: string | null
	categoria?: string | null
	/** Caminho da página que originou o evento — vira `source_page`. */
	caminho: string
}

export interface EventoAnalytics {
	nome: string
	params: Record<string, unknown>
}

const NOME_DO_EVENTO: Record<TipoDePagina, string> = {
	marca: 'brand_page_view',
	modelo: 'model_page_view',
	categoria: 'category_page_view',
}

/**
 * Remove chaves vazias.
 *
 * GA4 registra `undefined` como o literal "(not set)", que depois aparece em
 * relatório como se fosse um valor — ausente é mais honesto que preenchido com
 * ruído.
 */
function semVazios(params: Record<string, unknown>): Record<string, unknown> {
	const limpo: Record<string, unknown> = {}
	for (const [chave, valor] of Object.entries(params)) {
		if (valor !== null && valor !== undefined && valor !== '') limpo[chave] = valor
	}
	return limpo
}

/** Evento de visualização da página de marca, modelo ou categoria. */
export function eventoDePagina(ctx: ContextoDaPagina): EventoAnalytics {
	return {
		nome: NOME_DO_EVENTO[ctx.tipo],
		params: semVazios({
			brand: ctx.marca,
			model: ctx.modelo,
			category: ctx.categoria,
			source_page: ctx.caminho,
		}),
	}
}

export interface VeiculoClicado {
	id?: string | null
	marca?: string | null
	modelo?: string | null
	slug?: string | null
}

/**
 * Clique num card de veículo, carregando a página de origem.
 *
 * `brand` é o do VEÍCULO, não o da página: em /superesportivos os dois divergem,
 * e é a divergência que interessa. A marca da página continua disponível em
 * `page_brand`.
 */
export function eventoDeClique(
	veiculo: VeiculoClicado,
	ctx: ContextoDaPagina,
): EventoAnalytics {
	return {
		nome: 'vehicle_click',
		params: semVazios({
			vehicle_id: veiculo.id,
			vehicle_slug: veiculo.slug,
			brand: veiculo.marca,
			model: veiculo.modelo,
			page_brand: ctx.marca,
			category: ctx.categoria,
			source_page: ctx.caminho,
		}),
	}
}

export interface SolicitacaoDeVeiculo {
	/** O que foi ENVIADO, não o que veio pré-preenchido — o campo é editável. */
	marca?: string | null
	modelo?: string | null
	categoria?: string | null
	caminho: string
}

/** Envio do formulário de solicitação, com o contexto da página de origem. */
export function eventoDeSolicitacao(dados: SolicitacaoDeVeiculo): EventoAnalytics {
	return {
		nome: 'vehicle_request',
		params: semVazios({
			brand: dados.marca,
			model: dados.modelo,
			category: dados.categoria,
			source_page: dados.caminho,
			currency: 'BRL',
		}),
	}
}

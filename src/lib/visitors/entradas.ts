/**
 * Aba Entradas — em que página cada origem cai, e de onde vem quem cai em
 * cada página. Arquivo puro; o SQL entrega um grupo por (página de entrada ×
 * atribuição crua) e aqui a atribuição vira canal/fonte.
 */
import {
	classificarCanal,
	corCanal,
	normalizarFonte,
	rotuloCanal,
	rotuloFonte,
	type CanalTrafego,
} from '@/lib/traffic-channel'

export interface GrupoEntrada {
	page_path: string
	page_type: string | null
	vehicle_slug: string | null
	utm_source: string | null
	utm_medium: string | null
	tem_gclid: boolean
	tem_fbclid: boolean
	tem_ttclid: boolean
	referrer_domain: string | null
	sessoes: number
	whatsapp: number
	formularios: number
}

export interface FonteDaPagina {
	fonte: string
	rotulo_fonte: string
	sessoes: number
}

export interface LinhaPaginaEntrada {
	page_path: string
	page_type: string | null
	vehicle_slug: string | null
	sessoes: number
	whatsapp: number
	formularios: number
	/** Sessões por canal nesta página de entrada. */
	por_canal: Partial<Record<CanalTrafego, number>>
	/** As três fontes que mais trazem gente para esta página. */
	fontes: FonteDaPagina[]
}

export interface PaginaDoCanal {
	page_path: string
	page_type: string | null
	vehicle_slug: string | null
	sessoes: number
	whatsapp: number
}

export interface LinhaCanalEntrada {
	canal: CanalTrafego
	rotulo: string
	cor: string
	sessoes: number
	whatsapp: number
	paginas: PaginaDoCanal[]
}

function atribuicaoDe(g: GrupoEntrada) {
	return {
		utm_source: g.utm_source,
		utm_medium: g.utm_medium,
		gclid: g.tem_gclid ? '1' : null,
		fbclid: g.tem_fbclid ? '1' : null,
		ttclid: g.tem_ttclid ? '1' : null,
		referrer_domain: g.referrer_domain,
	}
}

/** Páginas de entrada com suas fontes, ordenadas por sessões. `limite` corta a cauda. */
export function agruparPorPagina(grupos: GrupoEntrada[], limite = 100): LinhaPaginaEntrada[] {
	type Acum = LinhaPaginaEntrada & { _fontes: Map<string, number> }
	const mapa = new Map<string, Acum>()
	for (const g of grupos) {
		const linha: Acum = mapa.get(g.page_path) ?? {
			page_path: g.page_path,
			page_type: g.page_type,
			vehicle_slug: g.vehicle_slug,
			sessoes: 0,
			whatsapp: 0,
			formularios: 0,
			por_canal: {},
			fontes: [],
			_fontes: new Map(),
		}
		const atrib = atribuicaoDe(g)
		const canal = classificarCanal(atrib)
		const fonte = normalizarFonte(atrib)
		linha.sessoes += g.sessoes
		linha.whatsapp += g.whatsapp
		linha.formularios += g.formularios
		linha.por_canal[canal] = (linha.por_canal[canal] ?? 0) + g.sessoes
		linha._fontes.set(fonte, (linha._fontes.get(fonte) ?? 0) + g.sessoes)
		mapa.set(g.page_path, linha)
	}
	return [...mapa.values()]
		.map(({ _fontes, ...l }) => ({
			...l,
			fontes: [..._fontes.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(([fonte, sessoes]) => ({ fonte, rotulo_fonte: rotuloFonte(fonte), sessoes })),
		}))
		.sort((a, b) => b.sessoes - a.sessoes)
		.slice(0, limite)
}

/** Para cada canal, as páginas em que ele mais cai. */
export function agruparPorCanal(grupos: GrupoEntrada[], paginasPorCanal = 6): LinhaCanalEntrada[] {
	const mapa = new Map<CanalTrafego, LinhaCanalEntrada & { _paginas: Map<string, PaginaDoCanal> }>()
	for (const g of grupos) {
		const canal = classificarCanal(atribuicaoDe(g))
		const linha = mapa.get(canal) ?? {
			canal,
			rotulo: rotuloCanal(canal),
			cor: corCanal(canal),
			sessoes: 0,
			whatsapp: 0,
			paginas: [],
			_paginas: new Map(),
		}
		linha.sessoes += g.sessoes
		linha.whatsapp += g.whatsapp
		const pg = linha._paginas.get(g.page_path) ?? {
			page_path: g.page_path,
			page_type: g.page_type,
			vehicle_slug: g.vehicle_slug,
			sessoes: 0,
			whatsapp: 0,
		}
		pg.sessoes += g.sessoes
		pg.whatsapp += g.whatsapp
		linha._paginas.set(g.page_path, pg)
		mapa.set(canal, linha)
	}
	return [...mapa.values()]
		.map(({ _paginas, ...l }) => ({
			...l,
			paginas: [..._paginas.values()].sort((a, b) => b.sessoes - a.sessoes).slice(0, paginasPorCanal),
		}))
		.sort((a, b) => b.sessoes - a.sessoes)
}

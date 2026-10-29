/**
 * O nome de um anúncio: marca + modelo + versão + ano.
 *
 * O mesmo texto vai para o <title>, a meta description, o JSON-LD e o
 * `seo_title` do mapeamento do estoque. Até 20/10/2026 o título saía de marca +
 * modelo + ano-modelo e perdia a versão: a ficha da Ferrari 296 GTS 2024/2025 se
 * chamava "Ferrari 296 2025", e a do 911 Carrera GTS Cabriolet, "Porsche 911
 * 2026" — exatamente a parte que distingue um carro de outro numa busca como
 * "911 GTS cabriolet à venda". O h1 já trazia a versão; o título é que não.
 *
 * A URL não muda: o slug continua derivado do id do estoque.
 */

import { expandirAbreviacoes } from '@/lib/normalizar-abreviacoes'

export interface VeiculoIdentificavel {
	brand?: string | null
	model?: string | null
	version?: string | null
	year_manufacture?: number | null
	year_model?: number | null
}

const limpar = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ')

/**
 * A versão como o comprador lê: abreviação do AutoConf por extenso e sem o
 * modelo repetido no começo.
 *
 * O `versao_descricao`, que o mapeamento usa quando não há `modelo_nome`, às
 * vezes começa pelo próprio modelo ("Range Rover VELAR SV" com modelo "Range
 * Rover"). Só o prefixo sai; o modelo no meio da versão fica.
 */
export function versaoDoVeiculo(v: VeiculoIdentificavel): string {
	const versao = limpar(expandirAbreviacoes(v.version))
	const modelo = limpar(v.model)
	if (!versao || !modelo) return versao
	if (versao.toLowerCase() === modelo.toLowerCase()) return ''
	const prefixo = `${modelo.toLowerCase()} `
	return versao.toLowerCase().startsWith(prefixo) ? versao.slice(prefixo.length).trim() : versao
}

/**
 * Ano no padrão brasileiro: "2024/2025" quando fabricação e modelo diferem,
 * um só quando coincidem. Ano ausente ou zerado não entra.
 */
export function anoDoVeiculo(v: VeiculoIdentificavel): string {
	const fabricacao = v.year_manufacture || null
	const modelo = v.year_model || null
	if (fabricacao && modelo && fabricacao !== modelo) return `${fabricacao}/${modelo}`
	return String(modelo ?? fabricacao ?? '')
}

/** "Porsche 911 Carrera GTS Cabriolet" — sem o ano. */
export function nomeDoVeiculo(v: VeiculoIdentificavel): string {
	return [limpar(v.brand), limpar(v.model), versaoDoVeiculo(v)].filter(Boolean).join(' ')
}

/**
 * "Ferrari 296 GTS 2024/2025". Sem o sufixo " | Attra Veículos": o
 * `title.template` do layout raiz já o acrescenta.
 */
export function tituloDoVeiculo(v: VeiculoIdentificavel): string {
	return [nomeDoVeiculo(v), anoDoVeiculo(v)].filter(Boolean).join(' ') || 'Veículo premium'
}

interface VeiculoDoEstoque extends VeiculoIdentificavel {
	id: string
	color?: string | null
	mileage?: number | null
}

/**
 * O título da ficha quando o estoque tem outro carro com o mesmo nome e ano:
 * as duas Temerário 2026 e os dois 296 GTB 2025 tinham <title> idêntico e
 * disputavam a mesma busca (auditoria de 28/10/2026). A cor resolve quase
 * sempre; com a cor também igual, entra a quilometragem.
 */
export function tituloDistintoDoVeiculo(v: VeiculoDoEstoque, estoque: VeiculoDoEstoque[]): string {
	const titulo = tituloDoVeiculo(v)
	const irmaos = estoque.filter(o => o.id !== v.id && tituloDoVeiculo(o) === titulo)
	if (irmaos.length === 0) return titulo

	const cor = limpar(v.color)
	const mesmaCor = (o: VeiculoDoEstoque) => limpar(o.color).toLowerCase() === cor.toLowerCase()
	if (cor && !irmaos.some(mesmaCor)) return `${titulo} ${cor}`

	const km = v.mileage ? `${v.mileage.toLocaleString('pt-BR')} km` : '0 km'
	return `${[titulo, cor].filter(Boolean).join(' ')}, ${km}`
}

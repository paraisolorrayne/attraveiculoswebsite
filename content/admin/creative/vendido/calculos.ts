/**
 * Contas do Story Vendido que não precisam de canvas: as cidades do campo
 * "Cidade de entrega", o enquadramento do mapa, o recorte da foto e os tons.
 * Ficam fora de story-vendido.ts para o teste rodar no Node.
 */

export interface Cidade {
	nome: string
	uf: string
	lon: number
	lat: number
}

/** Uma UF do mapa: cada anel é [lon×100, lat×100, lon×100, lat×100, …]. */
export interface ContornoUF {
	uf: string
	aneis: number[][]
}

/** De onde todo carro sai. Centroide do IBGE, igual ao de municipios.json. */
export const UBERLANDIA: Cidade = { nome: 'Uberlândia', uf: 'MG', lon: -48.33, lat: -19.03 }

/* ------------------------------------------------ cidades */

/** municipios.json traz cada cidade como [nome, uf, lon×100, lat×100] (ver scripts/preparar-mapa-vendido.py). */
export function lerMunicipios(linhas: [string, string, number, number][]): Cidade[] {
	return linhas.map(([nome, uf, lon, lat]) => ({ nome, uf, lon: lon / 100, lat: lat / 100 }))
}

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '))

/** Sem acento, minúsculo, só letras, números e um espaço entre as palavras. */
export function normalizar(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

/** 0 = nome igual, 1 = começa assim, 2 = uma palavra do meio começa assim, 3 = contém; -1 = não casa. */
function nota(nome: string, termo: string): number {
	const n = normalizar(nome)
	if (n === termo) return 0
	if (n.startsWith(termo)) return 1
	const palavras = n.split(' ')
	if (palavras.some((_, i) => i > 0 && palavras.slice(i).join(' ').startsWith(termo))) return 2
	if (n.includes(termo)) return 3
	return -1
}

/**
 * As cidades que casam com o que o operador digitou, até `limite`.
 *
 * Aceita "goiania", "Goiânia - GO", "sao paulo/sp" e "bom jesus rs". As duas
 * letras do fim podem ser a UF ou o começo de uma palavra: "santa ma" é a
 * Santa Maria sendo digitada, não "Santa…" no Maranhão. Por isso o texto
 * inteiro vem primeiro, e a leitura com a UF completa a lista. Ordem: nome
 * igual, começa assim, palavra do meio, contém; no empate, alfabética e UF.
 */
export function buscarCidades(cidades: Cidade[], consulta: string, limite = 8): Cidade[] {
	const termo = normalizar(consulta)
	if (!termo) return []
	const achar = (t: string, uf: string | null) =>
		cidades
			.filter(c => !uf || c.uf === uf)
			.map(c => ({ c, n: nota(c.nome, t) }))
			.filter(x => x.n >= 0)
			.sort((a, b) => a.n - b.n || a.c.nome.localeCompare(b.c.nome, 'pt-BR') || a.c.uf.localeCompare(b.c.uf))
			.map(x => x.c)
	const achadas = achar(termo, null)
	const m = termo.match(/^(.+) ([a-z]{2})$/)
	if (m && UFS.has(m[2].toUpperCase())) {
		for (const c of achar(m[1], m[2].toUpperCase())) if (!achadas.includes(c)) achadas.push(c)
	}
	return achadas.slice(0, limite)
}

/* ------------------------------------------------ mapa */

export interface Area {
	x0: number
	x1: number
	y0: number
	y1: number
}

export interface Projecao {
	x: (lon: number) => number
	y: (lat: number) => number
}

/**
 * Projeta lon/lat na área do mapa de modo que origem e destino caibam com
 * folga. Equirretangular com a longitude encolhida pelo cosseno da latitude
 * média — no recorte de um estado ou do país isso não deforma a ponto de se
 * notar. O vão mínimo de `vao` graus faz a venda para a cidade vizinha (ou na
 * própria Uberlândia) mostrar a região em volta, e não dois pontos colados no
 * meio de um mapa vazio.
 */
export function enquadrarRota(origem: Cidade, destino: Cidade, area: Area, vao = 10): Projecao {
	const kx = Math.cos(((origem.lat + destino.lat) / 2) * (Math.PI / 180))
	let lon0 = Math.min(origem.lon, destino.lon)
	let lon1 = Math.max(origem.lon, destino.lon)
	let lat0 = Math.min(origem.lat, destino.lat)
	let lat1 = Math.max(origem.lat, destino.lat)
	if ((lon1 - lon0) * kx < vao) {
		const c = (lon0 + lon1) / 2
		lon0 = c - vao / kx / 2
		lon1 = c + vao / kx / 2
	}
	if (lat1 - lat0 < vao * 0.45) {
		const c = (lat0 + lat1) / 2
		lat0 = c - vao * 0.225
		lat1 = c + vao * 0.225
	}
	const esc = Math.min((area.x1 - area.x0) / ((lon1 - lon0) * kx), (area.y1 - area.y0) / (lat1 - lat0))
	const cx = (area.x0 + area.x1) / 2
	const cy = (area.y0 + area.y1) / 2
	const lonC = (lon0 + lon1) / 2
	const latC = (lat0 + lat1) / 2
	return {
		x: lon => cx + (lon - lonC) * kx * esc,
		y: lat => cy - (lat - latC) * esc,
	}
}

export interface Ponto {
	x: number
	y: number
}

/**
 * Ponto de controle da curva de Uberlândia até o destino: o arco sempre
 * estufa para cima, mais alto quanto mais longe, até 160px. Pontos a menos
 * de 4px um do outro não têm arco (venda na própria cidade).
 */
export function controleDoArco(o: Ponto, d: Ponto): Ponto | null {
	const dist = Math.hypot(d.x - o.x, d.y - o.y)
	if (dist <= 4) return null
	let nx = -(d.y - o.y) / dist
	let ny = (d.x - o.x) / dist
	if (ny > 0) {
		nx = -nx
		ny = -ny
	}
	const curva = Math.min(dist * 0.32, 160)
	return { x: (o.x + d.x) / 2 + nx * curva, y: (o.y + d.y) / 2 + ny * curva }
}

/**
 * De que lado do ponto vai o nome da cidade: o `preferido`, a não ser que o
 * texto saia da peça por ali.
 */
export function ladoDoRotulo(x: number, largura: number, folga: number, preferido: 1 | -1, W: number, margem = 40): 1 | -1 {
	const cabe = (lado: 1 | -1) => (lado > 0 ? x + folga + largura <= W - margem : x - folga - largura >= margem)
	if (cabe(preferido)) return preferido
	return cabe(preferido === 1 ? -1 : 1) ? (preferido === 1 ? -1 : 1) : preferido
}

/* ------------------------------------------------ foto */

/**
 * As linhas da foto que entram na peça: ela ocupa a largura toda e no máximo
 * `alturaMax` de altura. Foto de estoque (4:3, 3:2) entra inteira; a em pé
 * perde o excesso de cima e de baixo, mais de cima, onde é teto da loja.
 */
export function recorteDaFoto(largura: number, altura: number, W: number, alturaMax: number): { sy: number; sh: number } {
	const sh = Math.min(altura, (largura * alturaMax) / W)
	return { sy: (altura - sh) * 0.6, sh }
}

/* ------------------------------------------------ tons */

export type RGB = [number, number, number]

export const misturar = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB

export const luz = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]

/**
 * Leva `c` na direção de `alvo` a partir da mistura `t`, e continua até a luz
 * passar de `limite` (para cima se o alvo é claro, para baixo se é escuro).
 * É o que segura um piso escuro de deixar a peça clara cinzenta — e um piso
 * claro de deixar a escura acinzentada.
 */
export function puxarPara(c: RGB, alvo: RGB, t: number, limite: number): RGB {
	const subir = luz(alvo) > luz(c)
	const ok = (r: RGB) => (subir ? luz(r) >= limite : luz(r) <= limite)
	let r = misturar(c, alvo, t)
	while (!ok(r) && t < 1) r = misturar(c, alvo, (t = Math.min(1, t + 0.02)))
	return r
}

/**
 * Paradas (y → alfa) numa curva suave de (y0, a0) a (y1, a1), sem quina nas
 * pontas. Degradê de duas paradas faz quina no começo e no fim, e o olho lê a
 * quina como uma linha atravessando a peça (17/10/2026).
 */
export function suave(y0: number, a0: number, y1: number, a1: number, n = 12): [number, number][] {
	return Array.from({ length: n + 1 }, (_, i) => {
		const t = i / n
		return [y0 + (y1 - y0) * t, a0 + (a1 - a0) * t * t * (3 - 2 * t)] as [number, number]
	})
}

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	UBERLANDIA,
	buscarCidades,
	controleDoArco,
	enquadrarRota,
	ladoDoRotulo,
	lerMunicipios,
	luz,
	normalizar,
	puxarPara,
	recorteDaFoto,
	suave,
	type Cidade,
} from '@content/admin/creative/vendido/calculos'

const publico = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'public/creative/vendido', f), 'utf8'))
const cidades: Cidade[] = lerMunicipios(publico('municipios.json'))
const achar = (nome: string, uf: string) => cidades.find(c => c.nome === nome && c.uf === uf)!
const nomes = (l: Cidade[]) => l.map(c => `${c.nome}/${c.uf}`)

describe('dados do mapa (IBGE)', () => {
	it('todos os municípios, com coordenadas dentro do Brasil', () => {
		expect(cidades).toHaveLength(5570)
		for (const c of cidades) {
			expect(c.lon).toBeGreaterThan(-74)
			expect(c.lon).toBeLessThan(-32)
			expect(c.lat).toBeGreaterThan(-34)
			expect(c.lat).toBeLessThan(5.5)
		}
	})

	it('Uberlândia da peça é a mesma do arquivo', () => {
		const u = achar('Uberlândia', 'MG')
		expect(u.lon).toBe(UBERLANDIA.lon)
		expect(u.lat).toBe(UBERLANDIA.lat)
	})

	it('as 27 UFs, cada uma com contorno', () => {
		const { ufs } = publico('ufs.json') as { ufs: { uf: string; aneis: number[][] }[] }
		expect(new Set(ufs.map(u => u.uf)).size).toBe(27)
		for (const u of ufs) {
			expect(u.aneis.length).toBeGreaterThan(0)
			for (const a of u.aneis) {
				expect(a.length % 2).toBe(0)
				expect(a.length).toBeGreaterThanOrEqual(8)
			}
		}
	})
})

describe('busca de cidade', () => {
	it('ignora acento e caixa', () => {
		expect(nomes(buscarCidades(cidades, 'goiania'))[0]).toBe('Goiânia/GO')
		expect(nomes(buscarCidades(cidades, 'SAO PAULO'))[0]).toBe('São Paulo/SP')
		expect(normalizar("  Pau-d'Arco ")).toBe('pau d arco')
	})

	it('a UF no fim filtra: "Goiânia - GO", "bom jesus rs", "sao paulo/sp"', () => {
		expect(nomes(buscarCidades(cidades, 'Goiânia - GO'))[0]).toBe('Goiânia/GO')
		expect(nomes(buscarCidades(cidades, 'bom jesus rs'))[0]).toBe('Bom Jesus/RS')
		expect(nomes(buscarCidades(cidades, 'sao paulo/sp'))[0]).toBe('São Paulo/SP')
	})

	it('homônimos aparecem todos, com a UF', () => {
		const r = nomes(buscarCidades(cidades, 'bom jesus', 20)).filter(n => n.startsWith('Bom Jesus/'))
		expect(r).toEqual(['Bom Jesus/PB', 'Bom Jesus/PI', 'Bom Jesus/RN', 'Bom Jesus/RS', 'Bom Jesus/SC'])
	})

	it('"santa ma" é a Santa Maria sendo digitada, não "Santa…" no Maranhão', () => {
		const r = nomes(buscarCidades(cidades, 'santa ma'))
		expect(r).toHaveLength(8)
		expect(r.every(n => n.startsWith('Santa Ma'))).toBe(true)
		expect(nomes(buscarCidades(cidades, 'santa maria', 20))).toContain('Santa Maria/RS')
	})

	it('nome igual antes de começa-com, e começa-com antes de contém', () => {
		const r = nomes(buscarCidades(cidades, 'campinas', 8))
		expect(r[0]).toBe('Campinas/SP')
		expect(r.indexOf('Campinas/SP')).toBeLessThan(r.findIndex(n => n.startsWith('Campinas ')))
	})

	it('vazio ou sem resultado devolve lista vazia; respeita o limite', () => {
		expect(buscarCidades(cidades, '   ')).toEqual([])
		expect(buscarCidades(cidades, 'xyzwq')).toEqual([])
		expect(buscarCidades(cidades, 'sa', 5)).toHaveLength(5)
	})
})

describe('enquadramento do mapa', () => {
	const area = { x0: 170, x1: 910, y0: 1180, y1: 1420 }
	const dentro = (x: number, y: number) => x >= area.x0 - 0.5 && x <= area.x1 + 0.5 && y >= area.y0 - 0.5 && y <= area.y1 + 0.5

	it.each([
		['Goiânia', 'GO'],
		['São Paulo', 'SP'],
		['Manaus', 'AM'],
		['Oiapoque', 'AP'],
		['Chuí', 'RS'],
		['Cruzeiro do Sul', 'AC'],
	])('Uberlândia e %s cabem na área', (nome, uf) => {
		const d = achar(nome, uf)
		const p = enquadrarRota(UBERLANDIA, d, area)
		expect(dentro(p.x(UBERLANDIA.lon), p.y(UBERLANDIA.lat))).toBe(true)
		expect(dentro(p.x(d.lon), p.y(d.lat))).toBe(true)
	})

	it('cidade vizinha não vira dois pontos colados: o vão mínimo mostra a região', () => {
		const d = achar('Araguari', 'MG')
		const p = enquadrarRota(UBERLANDIA, d, area)
		const pxPorGrau = Math.abs(p.y(0) - p.y(1))
		// 10° de vão em ~240px de altura útil: menos de 60px por grau.
		expect(pxPorGrau).toBeLessThan(60)
		expect(Math.hypot(p.x(d.lon) - p.x(UBERLANDIA.lon), p.y(d.lat) - p.y(UBERLANDIA.lat))).toBeLessThan(60)
	})

	it('venda na própria Uberlândia fica no centro', () => {
		const p = enquadrarRota(UBERLANDIA, UBERLANDIA, area)
		expect(p.x(UBERLANDIA.lon)).toBeCloseTo((area.x0 + area.x1) / 2)
		expect(p.y(UBERLANDIA.lat)).toBeCloseTo((area.y0 + area.y1) / 2)
	})

	it('o arco estufa para cima e cresce até 160px', () => {
		const c = controleDoArco({ x: 100, y: 500 }, { x: 300, y: 500 })!
		expect(c.y).toBeLessThan(500)
		expect(controleDoArco({ x: 100, y: 500 }, { x: 102, y: 501 })).toBeNull()
		const longe = controleDoArco({ x: 0, y: 500 }, { x: 1000, y: 500 })!
		expect(500 - longe.y).toBeCloseTo(160)
		// destino à esquerda e acima: continua estufando para cima
		const c2 = controleDoArco({ x: 600, y: 500 }, { x: 300, y: 300 })!
		expect(c2.y).toBeLessThan(400)
	})

	it('o nome da cidade troca de lado quando sairia da peça', () => {
		expect(ladoDoRotulo(500, 200, 50, 1, 1080)).toBe(1)
		expect(ladoDoRotulo(900, 200, 50, 1, 1080)).toBe(-1)
		expect(ladoDoRotulo(150, 200, 50, -1, 1080)).toBe(1)
	})
})

describe('foto', () => {
	it('deitada entra inteira; em pé perde o excesso, mais em cima', () => {
		expect(recorteDaFoto(1200, 900, 1080, 860)).toEqual({ sy: 0, sh: 900 })
		const r = recorteDaFoto(900, 1200, 1080, 860)
		expect((1080 * r.sh) / 900).toBeCloseTo(860)
		expect(r.sy).toBeGreaterThan((1200 - r.sh) / 2)
		expect(r.sy + r.sh).toBeLessThanOrEqual(1200)
	})
})

describe('tons', () => {
	it('piso escuro não deixa o fundo claro cinzento (e vice-versa)', () => {
		const claro = puxarPara([60, 60, 62], [246, 246, 246], 0.66, 232)
		expect(luz(claro)).toBeGreaterThanOrEqual(232)
		const escuro = puxarPara([200, 200, 196], [10, 11, 12], 0.84, 22)
		expect(luz(escuro)).toBeLessThanOrEqual(22)
		// já passou do limite com a mistura pedida: não mexe mais
		expect(puxarPara([240, 240, 240], [246, 246, 246], 0.5, 200)).toEqual([243, 243, 243])
	})

	it('a curva suave não tem quina: pontas exatas, sem pulo no começo nem no fim', () => {
		const p = suave(100, 0.9, 400, 0)
		expect(p[0]).toEqual([100, 0.9])
		expect(p[p.length - 1]).toEqual([400, 0])
		for (let i = 1; i < p.length; i++) expect(p[i][1]).toBeLessThanOrEqual(p[i - 1][1])
		const passos = p.slice(1).map((q, i) => p[i][1] - q[1])
		// os passos das pontas são bem menores que o do meio
		expect(passos[0]).toBeLessThan(passos[6] / 4)
		expect(passos[passos.length - 1]).toBeLessThan(passos[6] / 4)
	})
})

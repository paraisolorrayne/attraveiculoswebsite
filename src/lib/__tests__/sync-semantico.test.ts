import { describe, it, expect } from 'vitest'
import { passagemDoVeiculo } from '@/lib/mcp/passagem-do-veiculo'

const MACAN = {
	id: 1, brand: 'Porsche', model: 'Macan', version: 'GTS Bi-Turbo',
	year_model: 2024, body_type: 'SUV', doors: 4, mileage: 19_930, price: 499_000,
}

// Rótulos que `derivarRotulos(MACAN, 2026)` de fato produz — SUV 4 portas,
// 19.930 km (< 30.000), R$ 499.000 (>= 250.000). Usado para montar um
// `gravado` que "bate" com o que seria derivado agora, provando o cache.
const ROTULOS_MACAN_ATUAIS = {
	uso: ['viagem', 'urbano', 'familia'], // ordem embaralhada de propósito: a
	comprador: ['executivo', 'familia'],  // comparação do cache não pode
	forca: ['baixa-quilometragem', 'espaco'], // depender de ordem de array.
}

describe('passagemDoVeiculo', () => {
	it('inclui ficha e intenção na mesma passagem', async () => {
		const { passagem: p } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => null)
		expect(p).toContain('Porsche')
		expect(p).toContain('19.930 km')
		expect(p.toLowerCase()).toContain('família')
	})

	// A regressão que interessa: hoje a passagem NÃO tem essas palavras.
	it('faz a pergunta do comprador encontrar palavra no texto', async () => {
		const { passagem } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => null)
		const p = passagem.toLowerCase()
		for (const termo of ['família', 'viagem', 'baixa quilometragem']) {
			expect(p, `faltou "${termo}"`).toContain(termo)
		}
	})

	it('respeita sobrescrita humana', async () => {
		const { passagem: p } = await passagemDoVeiculo(MACAN, {
			uso: ['fim-de-semana'], comprador: ['entusiasta'], forca: [],
			prosa: null, sobrescritoPor: 'cris@attra.com.br',
		}, 2026, async () => null)
		expect(p.toLowerCase()).toContain('fim de semana')
		expect(p.toLowerCase()).not.toContain('família')
	})

	it('sai sem prosa quando o gerador falha', async () => {
		const { passagem: p } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => { throw new Error('cota') })
		expect(p).toContain('Porsche')
	})

	// Lado que faltava do `if (prosa == null)`: quando já existe prosa gravada
	// (sync anterior ou override humano), o gerador não deve ser chamado —
	// nem em caso de sucesso, nem de falha.
	it('inclui a prosa quando o gerador tem sucesso', async () => {
		const { passagem: p, prosa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => 'Frase gerada pelo modelo.')
		expect(p).toContain('Frase gerada pelo modelo.')
		expect(prosa).toBe('Frase gerada pelo modelo.')
	})

	// --- Cache de prosa (Rodada de conserto 1) -------------------------------
	//
	// A rota grava a `prosa` devolvida por `passagemDoVeiculo` em vez de `null`
	// fixo. Sem isso, toda sincronização (cron de 6h) regeraria a prosa do
	// zero — ~300 chamadas de modelo/dia para ~77 veículos que não mudaram, e
	// o texto indexado do mesmo carro variando 4x ao dia sem o carro mudar.

	it('rótulos iguais aos gravados: reusa a prosa do cache e NÃO chama o gerador', async () => {
		const chamadas: string[] = []
		const gravado = {
			...ROTULOS_MACAN_ATUAIS,
			prosa: 'Prosa em cache, gerada numa sincronização anterior.',
			sobrescritoPor: null,
		}
		const { passagem: p, prosa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return 'não deveria ser chamado'
		})
		expect(chamadas).toHaveLength(0)
		expect(prosa).toBe('Prosa em cache, gerada numa sincronização anterior.')
		expect(p).toContain('Prosa em cache, gerada numa sincronização anterior.')
	})

	it('sem prosa gravada: chama o gerador exatamente uma vez', async () => {
		const chamadas: string[] = []
		const { prosa } = await passagemDoVeiculo(MACAN, undefined, 2026, async () => {
			chamadas.push('chamou')
			return 'Prosa recém-gerada.'
		})
		expect(chamadas).toHaveLength(1)
		expect(prosa).toBe('Prosa recém-gerada.')
	})

	// --- Invalidação de cache quando os rótulos mudam (agravante da rodada 1) -
	//
	// A prosa é gerada A PARTIR dos rótulos. Se o carro cruzou um limiar (ex.:
	// passou de 30.000 km e perdeu `baixa-quilometragem`), a prosa cacheada
	// descreve um carro que já não existe — afirmação falsa no índice, o
	// mesmo dano que a trava de `perfil-semantico.ts` existe para impedir.

	it('rótulos derivados divergem dos gravados: descarta a prosa cacheada e chama o gerador', async () => {
		const chamadas: string[] = []
		// `forca` gravada não tem 'baixa-quilometragem' — diverge do que
		// `derivarRotulos(MACAN, 2026)` produz agora (19.930 km < 30.000).
		const gravado = {
			uso: ROTULOS_MACAN_ATUAIS.uso,
			comprador: ROTULOS_MACAN_ATUAIS.comprador,
			forca: ['espaco'],
			prosa: 'Prosa antiga, de antes do carro rodar mais.',
			sobrescritoPor: null,
		}
		const { passagem: p, prosa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return 'Prosa nova, coerente com os rótulos atuais.'
		})
		expect(chamadas).toHaveLength(1)
		expect(prosa).toBe('Prosa nova, coerente com os rótulos atuais.')
		expect(p).toContain('Prosa nova, coerente com os rótulos atuais.')
		expect(p).not.toContain('Prosa antiga, de antes do carro rodar mais.')
	})

	it('linha sobrescrita à mão: mantém a prosa humana mesmo com rótulos derivados divergentes', async () => {
		const chamadas: string[] = []
		const gravado = {
			uso: ['fim-de-semana'],
			comprador: ['entusiasta'],
			forca: [], // nada bate com o que seria derivado para o MACAN agora
			prosa: 'Prosa escrita à mão pela Attra.',
			sobrescritoPor: 'cris@attra.com.br',
		}
		const { passagem: p, prosa } = await passagemDoVeiculo(MACAN, gravado, 2026, async () => {
			chamadas.push('chamou')
			return 'não deveria ser chamado'
		})
		expect(chamadas).toHaveLength(0)
		expect(prosa).toBe('Prosa escrita à mão pela Attra.')
		expect(p).toContain('Prosa escrita à mão pela Attra.')
	})
})

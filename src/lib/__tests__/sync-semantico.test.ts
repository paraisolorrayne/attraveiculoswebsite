import { describe, it, expect } from 'vitest'
import { passagemDoVeiculo } from '@/lib/mcp/passagem-do-veiculo'

const MACAN = {
	id: 1, brand: 'Porsche', model: 'Macan', version: 'GTS Bi-Turbo',
	year_model: 2024, body_type: 'SUV', doors: 4, mileage: 19_930, price: 499_000,
}

describe('passagemDoVeiculo', () => {
	it('inclui ficha e intenção na mesma passagem', async () => {
		const p = await passagemDoVeiculo(MACAN, undefined, 2026, async () => null)
		expect(p).toContain('Porsche')
		expect(p).toContain('19.930 km')
		expect(p.toLowerCase()).toContain('família')
	})

	// A regressão que interessa: hoje a passagem NÃO tem essas palavras.
	it('faz a pergunta do comprador encontrar palavra no texto', async () => {
		const p = (await passagemDoVeiculo(MACAN, undefined, 2026, async () => null)).toLowerCase()
		for (const termo of ['família', 'viagem', 'baixa quilometragem']) {
			expect(p, `faltou "${termo}"`).toContain(termo)
		}
	})

	it('respeita sobrescrita humana', async () => {
		const p = await passagemDoVeiculo(MACAN, {
			uso: ['fim-de-semana'], comprador: ['entusiasta'], forca: [],
			prosa: null, sobrescritoPor: 'cris@attra.com.br',
		}, 2026, async () => null)
		expect(p.toLowerCase()).toContain('fim de semana')
		expect(p.toLowerCase()).not.toContain('família')
	})

	it('sai sem prosa quando o gerador falha', async () => {
		const p = await passagemDoVeiculo(MACAN, undefined, 2026, async () => { throw new Error('cota') })
		expect(p).toContain('Porsche')
	})

	// Lado que faltava do `if (prosa == null)`: quando já existe prosa gravada
	// (sync anterior ou override humano), o gerador não deve ser chamado —
	// nem em caso de sucesso, nem de falha.
	it('usa a prosa já gravada e não chama o gerador', async () => {
		let chamado = false
		const p = await passagemDoVeiculo(MACAN, {
			uso: [], comprador: [], forca: [],
			prosa: 'Porsche Macan para uso urbano.', sobrescritoPor: null,
		}, 2026, async () => { chamado = true; return 'não deveria ser chamado' })
		expect(chamado).toBe(false)
		expect(p).toContain('Porsche Macan para uso urbano.')
	})

	// Lado que faltava do try/catch do gerador: sucesso normal inclui a prosa
	// gerada na passagem (o teste do brief só cobre a falha).
	it('inclui a prosa quando o gerador tem sucesso', async () => {
		const p = await passagemDoVeiculo(MACAN, undefined, 2026, async () => 'Frase gerada pelo modelo.')
		expect(p).toContain('Frase gerada pelo modelo.')
	})
})

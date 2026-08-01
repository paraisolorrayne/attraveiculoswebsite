import { describe, it, expect } from 'vitest'
import { cardSemInformacao } from '@/app/admin/crm/crm-constants'

interface CardMinimo {
	nome: string | null
	telefone: string | null
	email: string | null
	veiculo: string | null
	valor: number | null
	vendedor: string | null
	andamento: string | null
	impedimento: string | null
	proxima_acao: string | null
	motivo_encerramento: string | null
}

/** Card em branco como os 16 que chegaram do CRM em 31/07/2026. */
const vazio: CardMinimo = {
	nome: null,
	telefone: null,
	email: null,
	veiculo: null,
	valor: null,
	vendedor: null,
	andamento: null,
	impedimento: null,
	proxima_acao: null,
	motivo_encerramento: null,
}

describe('cardSemInformacao', () => {
	it('oculta o card que só tem etapa, situação e data', () => {
		expect(cardSemInformacao(vazio)).toBe(true)
	})

	it('trata string vazia e espaços como ausência de dado', () => {
		expect(cardSemInformacao({ ...vazio, nome: '', telefone: '   ' })).toBe(true)
	})

	// Um sinal basta para o card continuar no quadro: o critério é
	// conservador de propósito, some só o que não tem absolutamente nada.
	const comSinal: [string, Partial<CardMinimo>][] = [
		['nome', { nome: 'Ricardo Almeida' }],
		['telefone', { telefone: '34999887766' }],
		['e-mail', { email: 'cliente@example.com' }],
		['veículo', { veiculo: 'Porsche 911 Carrera GTS 2024' }],
		['vendedor', { vendedor: 'Ana Souza' }],
		['andamento', { andamento: 'Cliente pediu simulação.' }],
		['impedimento', { impedimento: 'Viaja até dia 10.' }],
		['próxima ação', { proxima_acao: 'Retomar contato' }],
		['motivo do encerramento', { motivo_encerramento: 'Comprou em outra loja' }],
	]

	for (const [rotulo, campo] of comSinal) {
		it(`mantém o card que tem ${rotulo}`, () => {
			expect(cardSemInformacao({ ...vazio, ...campo })).toBe(false)
		})
	}

	// valor 0 é informação (proposta zerada existe); só null é ausência.
	it('mantém o card cujo único dado é o valor, inclusive zero', () => {
		expect(cardSemInformacao({ ...vazio, valor: 335000 })).toBe(false)
		expect(cardSemInformacao({ ...vazio, valor: 0 })).toBe(false)
	})
})

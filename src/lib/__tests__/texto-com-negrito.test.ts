import { describe, expect, it } from 'vitest'
import { partesComNegrito } from '@/lib/texto-com-negrito'

// A política de privacidade marca os rótulos com **…**, mas a página mostrava
// o texto cru: no ar aparecia "**No Site:**" com os asteriscos.
describe('partesComNegrito', () => {
	it('separa o trecho entre ** como negrito e tira os asteriscos', () => {
		expect(partesComNegrito('• **No Site:** Nome, e-mail e telefone.')).toEqual([
			{ texto: '• ', negrito: false },
			{ texto: 'No Site:', negrito: true },
			{ texto: ' Nome, e-mail e telefone.', negrito: false },
		])
	})

	it('mantém as quebras de linha do texto', () => {
		const partes = partesComNegrito('Antes:\n\n• **A:** um\n• **B:** dois')
		expect(partes.map(p => p.texto).join('')).toBe('Antes:\n\n• A: um\n• B: dois')
		expect(partes.filter(p => p.negrito).map(p => p.texto)).toEqual(['A:', 'B:'])
	})

	it('texto sem marcação volta inteiro', () => {
		expect(partesComNegrito('Sem destaque.')).toEqual([{ texto: 'Sem destaque.', negrito: false }])
	})

	it('** sem par não vira negrito nem some', () => {
		expect(partesComNegrito('nota ** solta')).toEqual([{ texto: 'nota ** solta', negrito: false }])
	})
})

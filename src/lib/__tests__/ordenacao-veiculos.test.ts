import { describe, it, expect } from 'vitest'
import { porPrecoDecrescente } from '@/lib/ordenacao-veiculos'

const carro = (nome: string, price: number | null | undefined) => ({ nome, price })

describe('porPrecoDecrescente', () => {
	it('ordena do mais caro para o mais barato', () => {
		const lista = [
			carro('Audi Q5', 329_000),
			carro('Ferrari 296', 3_790_000),
			carro('Porsche 911', 1_200_000),
		]
		expect(porPrecoDecrescente(lista).map(v => v.nome)).toEqual([
			'Ferrari 296',
			'Porsche 911',
			'Audi Q5',
		])
	})

	// A lista vem de um fetch compartilhado entre seções da mesma página;
	// ordenar no lugar reordenaria as outras junto.
	it('não muta a lista recebida', () => {
		const lista = [carro('A', 100), carro('B', 900)]
		const copia = [...lista]
		porPrecoDecrescente(lista)
		expect(lista).toEqual(copia)
	})

	// Numa grade de seis, um "sob consulta" no topo derrubaria o carro mais caro
	// do estoque para fora da página.
	it('joga sem preço para o fim', () => {
		const lista = [
			carro('Sob consulta', null),
			carro('Barato', 200_000),
			carro('Caro', 2_000_000),
			carro('Indefinido', undefined),
		]
		expect(porPrecoDecrescente(lista).map(v => v.nome)).toEqual([
			'Caro',
			'Barato',
			'Sob consulta',
			'Indefinido',
		])
	})

	it('trata preço zero como ausente, não como o mais barato', () => {
		const lista = [carro('Zero', 0), carro('Real', 150_000)]
		expect(porPrecoDecrescente(lista).map(v => v.nome)).toEqual(['Real', 'Zero'])
	})

	// O defeito que a função existe para evitar: cortar antes de ordenar mostra
	// seis carros quaisquer, e o mais caro pode não estar entre eles.
	it('o mais caro sobrevive ao corte de seis quando se ordena primeiro', () => {
		const estoque = [
			...Array.from({ length: 8 }, (_, i) => carro(`Comum ${i}`, 300_000 + i)),
			carro('Ferrari 296', 3_790_000),
		]
		const errado = estoque.slice(0, 6).map(v => v.nome)
		const certo = porPrecoDecrescente(estoque).slice(0, 6).map(v => v.nome)

		expect(errado).not.toContain('Ferrari 296')
		expect(certo[0]).toBe('Ferrari 296')
	})

	it('aguenta lista vazia e de um item', () => {
		expect(porPrecoDecrescente([])).toEqual([])
		expect(porPrecoDecrescente([carro('Único', 1)]).map(v => v.nome)).toEqual(['Único'])
	})
})

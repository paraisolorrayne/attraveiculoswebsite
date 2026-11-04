import { describe, it, expect } from 'vitest'
import { semModeloRepetido } from '@/lib/selecao-editorial'
import type { Vehicle } from '@/types'

const carro = (id: string, brand: string, model: string, price: number) =>
	({ id, brand, model, price }) as unknown as Vehicle

describe('seleção editorial da home sem modelo repetido', () => {
	// 04/11/2026: "Três peças do acervo" mostrava a Ferrari 296 e dois Aston
	// Martin Vantage 2026 praticamente iguais (899967 e 1090765), as posições 7-9.
	it('pula o segundo carro de mesma marca e modelo e pega o próximo da lista', () => {
		const lista = [
			carro('1099157', 'Ferrari', '296', 2_900_000),
			carro('899967', 'Aston Martin', 'Vantage', 2_100_000),
			carro('1090765', 'Aston Martin', 'Vantage', 2_050_000),
			carro('5', 'Porsche', '911', 1_900_000),
		]
		expect(semModeloRepetido(lista, 3).map(v => v.id)).toEqual(['1099157', '899967', '5'])
	})

	it('compara sem caixa, acento nem espaço', () => {
		const lista = [
			carro('1', 'Aston Martin', 'Vantage', 3),
			carro('2', 'ASTON MARTIN', ' vantage ', 2),
			carro('3', 'Mercedes-Benz', 'Classe G', 1),
			carro('4', 'Mercedes Benz', 'Classe G', 1),
		]
		expect(semModeloRepetido(lista, 3).map(v => v.id)).toEqual(['1', '3'])
	})

	it('mesmo modelo de marcas diferentes não é repetição', () => {
		const lista = [carro('1', 'Ram', '3500', 3), carro('2', 'Chevrolet', '3500', 2)]
		expect(semModeloRepetido(lista, 3).map(v => v.id)).toEqual(['1', '2'])
	})

	it('sem modelos diferentes suficientes, mostra menos em vez de repetir', () => {
		const lista = [carro('1', 'Aston Martin', 'Vantage', 2), carro('2', 'Aston Martin', 'Vantage', 1)]
		expect(semModeloRepetido(lista, 3).map(v => v.id)).toEqual(['1'])
	})
})

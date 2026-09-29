import { describe, it, expect } from 'vitest'
import {
	FAIXAS_TEMPO_CLIQUE,
	faixaDoClique,
	linhaCampanhaScore,
	pesoDoClique,
	type GrupoCampanhaScore,
} from '@/lib/visitors/score-clique'

describe('pesoDoClique', () => {
	it('pesa pelo tempo entre a chegada e o primeiro clique', () => {
		expect(pesoDoClique(0)).toBe(0.25)
		expect(pesoDoClique(9.9)).toBe(0.25)
		expect(pesoDoClique(10)).toBe(0.5)
		expect(pesoDoClique(29)).toBe(0.5)
		expect(pesoDoClique(30)).toBe(0.75)
		expect(pesoDoClique(60)).toBe(1)
		expect(pesoDoClique(179)).toBe(1)
		expect(pesoDoClique(180)).toBe(1.25)
		expect(pesoDoClique(3600)).toBe(1.25)
	})

	it('trata tempo negativo (relógio adiantado) como clique imediato', () => {
		expect(pesoDoClique(-5)).toBe(0.25)
	})
})

describe('faixaDoClique', () => {
	it('devolve o índice da faixa, alinhado com FAIXAS_TEMPO_CLIQUE', () => {
		expect(faixaDoClique(5)).toBe(0)
		expect(faixaDoClique(45)).toBe(2)
		expect(faixaDoClique(999)).toBe(FAIXAS_TEMPO_CLIQUE.length - 1)
	})
})

function grupo(p: Partial<GrupoCampanhaScore>): GrupoCampanhaScore {
	return {
		chave: 'pmax',
		rotulo: 'PMax',
		sessoes: 100,
		whatsapp: 10,
		sessoes_mensuraveis: 100,
		soma_pesos: 2.5,
		mediana_segundos: 12,
		viraram_card: 1,
		...p,
	}
}

describe('linhaCampanhaScore', () => {
	it('calcula conversão bruta e conversão ponderada (score)', () => {
		const l = linhaCampanhaScore(grupo({}))
		expect(l.conversao).toBeCloseTo(0.1)
		expect(l.score).toBeCloseTo(0.025)
		expect(l.mediana_segundos).toBe(12)
	})

	it('score usa só as sessões desde que o horário do clique é gravado', () => {
		const l = linhaCampanhaScore(grupo({ sessoes: 200, sessoes_mensuraveis: 50, soma_pesos: 5 }))
		expect(l.score).toBeCloseTo(0.1)
	})

	it('sem sessão mensurável o score é null, não zero', () => {
		const l = linhaCampanhaScore(grupo({ sessoes_mensuraveis: 0, soma_pesos: 0, mediana_segundos: null }))
		expect(l.score).toBeNull()
		expect(l.mediana_segundos).toBeNull()
	})

	it('campanha vazia vira "(sem campanha)"', () => {
		const l = linhaCampanhaScore(grupo({ chave: '', rotulo: '' }))
		expect(l.chave).toBe('(sem campanha)')
		expect(l.rotulo).toBe('(sem campanha)')
	})
})

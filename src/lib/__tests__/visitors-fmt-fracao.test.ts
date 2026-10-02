import { describe, it, expect } from 'vitest'
import { fmtFracao, fmtPct, taxa } from '@/app/admin/visitors/visitors-metrics'

/**
 * Conversão e score da tabela de campanhas vêm como FRAÇÃO (0,0529); o fmtPct
 * espera PERCENTUAL (5,29). Passar a fração direto mostrava "0,1%" no lugar de
 * "5,3%" — 100 vezes menor (em produção de 01/10 a 02/10/2026).
 */
describe('fmtFracao', () => {
	it('formata fração como percentual', () => {
		expect(fmtFracao(0.0529)).toBe('5,3%')
		expect(fmtFracao(0.0529)).toBe(fmtPct(taxa(529, 10_000)))
		expect(fmtFracao(1)).toBe('100,0%')
		expect(fmtFracao(0, 0)).toBe('0%')
	})
})

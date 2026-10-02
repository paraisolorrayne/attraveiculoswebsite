import { describe, it, expect } from 'vitest'
import { classeDaPrioridade, prioridadeDaColuna, semLarguraMinima } from '@/app/admin/visitors/largura-total'

describe('modo largura total', () => {
	it('prioridade: explícita vence; senão as 3 primeiras são essenciais', () => {
		expect([0, 1, 2, 3, 4, 5, 9].map(i => prioridadeDaColuna(i))).toEqual([1, 1, 1, 2, 2, 3, 3])
		expect(prioridadeDaColuna(7, 1)).toBe(1)
		expect(prioridadeDaColuna(0, 3)).toBe(3)
	})

	it('classe de visibilidade por prioridade', () => {
		expect(classeDaPrioridade(1)).toBe('')
		expect(classeDaPrioridade(2)).toBe('hidden md:table-cell')
		expect(classeDaPrioridade(3)).toBe('hidden xl:table-cell')
	})

	it('tira largura mínima e nowrap, que são o que empurra a tabela para fora da tela', () => {
		expect(semLarguraMinima('min-w-[140px] tabular-nums whitespace-nowrap')).toBe('tabular-nums')
		expect(semLarguraMinima('max-w-[300px] min-w-[180px]')).toBe('max-w-[300px]')
		expect(semLarguraMinima(undefined)).toBe('')
	})
})

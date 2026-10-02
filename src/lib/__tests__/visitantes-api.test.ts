import { describe, it, expect } from 'vitest'
import { API_DO_ADMIN, comParams } from '@/app/admin/visitors/visitantes-api'

describe('VisitantesApi', () => {
	it('comParams ignora vazios e indefinidos', () => {
		expect(comParams('/x', { dias: 30, a: '', b: undefined, c: 'y z' })).toBe('/x?dias=30&c=y+z')
		expect(comParams('/x')).toBe('/x')
	})

	it('padrão do painel da Attra: mesmas rotas de hoje', () => {
		expect(API_DO_ADMIN.api('origens', { dias: 30 })).toBe('/api/admin/visitors/origens?dias=30')
		// O detalhe de sessão continua na rota antiga no painel da Attra.
		expect(API_DO_ADMIN.api('sessao', { session_id: 'abc' })).toBe('/api/admin/visitors/session-explore?session_id=abc')
		expect(API_DO_ADMIN.link('/campanha/va-pmax')).toBe('/admin/visitors/campanha/va-pmax')
		expect(API_DO_ADMIN.modo).toBe('attra')
	})
})

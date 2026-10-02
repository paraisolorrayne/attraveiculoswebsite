import { describe, it, expect } from 'vitest'
import { comFiltros, linkDaAgencia } from '@/lib/agencias/links'

describe('linkDaAgencia', () => {
	it('abas de visitantes, detalhe de campanha e de sessão vão para os lugares certos', () => {
		expect(linkDaAgencia('mh', '/origens')).toBe('/admin/agencia/mh/visitantes/origens')
		expect(linkDaAgencia('mh', '/campanha/va-pmax')).toBe('/admin/agencia/mh/campanha/va-pmax')
		expect(linkDaAgencia('mh', '/sessoes/123-abc')).toBe('/admin/agencia/mh/sessoes/123-abc')
	})

	it('lista de sessões (com ou sem filtro) é a aba, não o detalhe', () => {
		expect(linkDaAgencia('mh', '/sessoes')).toBe('/admin/agencia/mh/visitantes/sessoes')
		expect(linkDaAgencia('mh', '/sessoes?dias=30&fonte=google')).toBe('/admin/agencia/mh/visitantes/sessoes?dias=30&fonte=google')
	})

	it('a raiz de visitantes é a visão geral', () => {
		expect(linkDaAgencia('mh', '')).toBe('/admin/agencia/mh/visitantes/visao-geral')
	})
})

describe('comFiltros', () => {
	it('leva plataforma e campanhas junto, sem sobrescrever o que o link já tem', () => {
		expect(comFiltros('/a', { plataforma: 'meta', campanhas: '' })).toBe('/a?plataforma=meta')
		expect(comFiltros('/a?dias=7', { plataforma: 'meta', dias: '30' })).toBe('/a?dias=7&plataforma=meta')
		expect(comFiltros('/a', {})).toBe('/a')
	})
})

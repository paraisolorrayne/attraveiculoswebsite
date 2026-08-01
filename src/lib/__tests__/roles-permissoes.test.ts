import { describe, it, expect } from 'vitest'
import { canAccessRoute, AREAS_SO_ADMIN } from '@/lib/auth/roles'
import { sectionsForRole } from '@/lib/admin-sections'

describe('canAccessRoute — comportamento sem exceções (não pode regredir)', () => {
	it('admin acessa tudo', () => {
		expect(canAccessRoute('admin', '/admin/usuarios')).toBe(true)
		expect(canAccessRoute('admin', '/admin/visitors')).toBe(true)
	})

	it('owner tem tudo menos gestão de usuários', () => {
		expect(canAccessRoute('owner', '/admin/crm')).toBe(true)
		expect(canAccessRoute('owner', '/admin/usuarios')).toBe(false)
	})

	it('marketing segue a matriz do papel', () => {
		expect(canAccessRoute('marketing', '/admin/marketing')).toBe(true)
		expect(canAccessRoute('marketing', '/admin/visitors')).toBe(false)
	})

	it('login e reset são livres para qualquer papel', () => {
		expect(canAccessRoute('gerente', '/admin/login')).toBe(true)
		expect(canAccessRoute('gerente', '/admin/reset-password')).toBe(true)
	})
})

describe('canAccessRoute — exceções por usuário', () => {
	// O caso que motivou a funcionalidade: Eduardo é marketing e precisa ver
	// a análise de visitantes sem virar operador nem admin.
	it('concede uma seção que o papel não teria', () => {
		expect(canAccessRoute('marketing', '/admin/visitors', { '/admin/visitors': true })).toBe(true)
	})

	it('a concessão não vaza para outras seções', () => {
		expect(canAccessRoute('marketing', '/admin/crm', { '/admin/visitors': true })).toBe(false)
	})

	it('revoga uma seção que o papel teria', () => {
		expect(canAccessRoute('marketing', '/admin/blog', { '/admin/blog': false })).toBe(false)
	})

	it('vale para sub-rotas da seção concedida', () => {
		expect(canAccessRoute('marketing', '/admin/visitors/detalhe', { '/admin/visitors': true })).toBe(true)
	})

	it('prefixo mais específico vence o mais genérico', () => {
		const secoes = { '/admin/blog': false, '/admin/blog/rascunhos': true }
		expect(canAccessRoute('marketing', '/admin/blog', secoes)).toBe(false)
		expect(canAccessRoute('marketing', '/admin/blog/rascunhos', secoes)).toBe(true)
	})

	it('ignora chave que não é rota do admin', () => {
		// Lixo no JSONB não pode virar regra de acesso.
		expect(canAccessRoute('marketing', '/admin/visitors', { visitors: true } as never)).toBe(false)
		expect(canAccessRoute('marketing', '/admin/visitors', { '/api/interno': true })).toBe(false)
	})

	it('exceções vazias se comportam como antes', () => {
		expect(canAccessRoute('marketing', '/admin/visitors', {})).toBe(false)
		expect(canAccessRoute('marketing', '/admin/marketing', {})).toBe(true)
	})
})

describe('canAccessRoute — travas de segurança', () => {
	// Conceder a gestão de usuários é conceder o poder de editar papéis e
	// permissões, ou seja, de se autopromover a admin.
	it('nenhuma exceção concede a gestão de usuários', () => {
		for (const area of AREAS_SO_ADMIN) {
			expect(canAccessRoute('owner', area, { [area]: true })).toBe(false)
			expect(canAccessRoute('marketing', area, { [area]: true })).toBe(false)
		}
	})

	it('nem por sub-rota da gestão de usuários', () => {
		expect(canAccessRoute('owner', '/admin/usuarios/novo', { '/admin/usuarios': true })).toBe(false)
	})

	it('exceção não trancafia o admin para fora', () => {
		expect(canAccessRoute('admin', '/admin/usuarios', { '/admin/usuarios': false })).toBe(true)
		expect(canAccessRoute('admin', '/admin/crm', { '/admin/crm': false })).toBe(true)
	})
})

describe('sectionsForRole — o menu reflete as exceções', () => {
	it('mostra a seção concedida por exceção', () => {
		const semExcecao = sectionsForRole('marketing').map(s => s.href)
		const comExcecao = sectionsForRole('marketing', { '/admin/visitors': true }).map(s => s.href)
		expect(semExcecao).not.toContain('/admin/visitors')
		expect(comExcecao).toContain('/admin/visitors')
	})

	it('esconde a seção revogada por exceção', () => {
		const hrefs = sectionsForRole('marketing', { '/admin/blog': false }).map(s => s.href)
		expect(hrefs).not.toContain('/admin/blog')
	})

	it('nunca mostra gestão de usuários para quem não é admin', () => {
		const hrefs = sectionsForRole('owner', { '/admin/usuarios': true }).map(s => s.href)
		expect(hrefs).not.toContain('/admin/usuarios')
	})
})

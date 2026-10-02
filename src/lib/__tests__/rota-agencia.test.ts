import { describe, it, expect } from 'vitest'
import { rotaPermitidaParaAgencia } from '@/lib/auth/roles'

/**
 * O papel `agencia` é a primeira credencial de gente de fora da loja. Várias
 * rotas antigas de /api/admin só checam "está logado" (newsletter com e-mails
 * de inscritos, edição do blog, sons…); o middleware nega a agência em tudo que
 * não for a área dela (achado da revisão final, 02/10/2026).
 */
describe('rotaPermitidaParaAgencia', () => {
	it('libera a área da agência, o hub (que redireciona) e entrar/sair', () => {
		for (const p of [
			'/admin',
			'/admin/agencia/media-house',
			'/admin/agencia/media-house/visitantes/origens',
			'/admin/login',
			'/admin/reset-password',
			'/api/admin/agencia/media-house/visitantes/resumo',
			'/api/admin/agencia/media-house/campanhas',
			'/api/admin/login',
			'/api/admin/logout',
		]) {
			expect(rotaPermitidaParaAgencia(p), p).toBe(true)
		}
	})

	it('nega todo o resto do admin e da API', () => {
		for (const p of [
			'/admin/visitors',
			'/admin/crm',
			'/admin/blog',
			'/admin/agenciaX',
			'/api/admin/newsletter/subscribers',
			'/api/admin/newsletter/subscribers/export',
			'/api/admin/blog',
			'/api/admin/engine-sounds/upload',
			'/api/admin/marketing/users',
			'/api/admin/visitors/origens',
			'/api/admin/users',
			'/api/admin/cron-status',
			'/api/admin/agencia', // sem slug não é rota da área
		]) {
			expect(rotaPermitidaParaAgencia(p), p).toBe(false)
		}
	})
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { configuracaoRetornoCrm, enviarRetornoCrm } from '@/lib/crm-retorno'
import { verifyCrmSignature } from '@/lib/crm-webhook'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('retorno ao sistema', () => {
	it('exige endpoint HTTPS e segredo próprios', () => {
		vi.stubEnv('CRM_RETURN_WEBHOOK_URL', '')
		vi.stubEnv('CRM_RETURN_WEBHOOK_SECRET', '')
		expect(configuracaoRetornoCrm()).toBeNull()
		vi.stubEnv('CRM_RETURN_WEBHOOK_URL', 'http://crm.example/retorno')
		vi.stubEnv('CRM_RETURN_WEBHOOK_SECRET', 'segredo-teste')
		expect(configuracaoRetornoCrm()).toBeNull()
		vi.stubEnv('CRM_RETURN_WEBHOOK_URL', 'https://crm.example/retorno')
		expect(configuracaoRetornoCrm()).not.toBeNull()
	})
	it('assina o corpo exato e reutiliza a chave idempotente nas tentativas', async () => {
		const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(new Response(null, { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)
		const evento = { id: 'evento-1', corpo: '{"vendedor":"João"}' }
		const config = { url: 'https://crm.example/retorno', secret: 'segredo-teste' }
		expect(await enviarRetornoCrm(evento, config)).toBe('HTTP 503')
		expect(await enviarRetornoCrm(evento, config)).toBeNull()
		for (const [, options] of fetchMock.mock.calls) {
			expect(options.body).toBe(evento.corpo)
			expect(options.headers['Idempotency-Key']).toBe(evento.id)
			expect(verifyCrmSignature(options.body, options.headers['X-CRM-Signature'], config.secret)).toBe(true)
			expect(options.redirect).toBe('error')
		}
	})
	it('não vaza detalhes da conexão quando falha', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('https://private.example?secret=abc')))
		expect(await enviarRetornoCrm({ id: '1', corpo: '{}' }, { url: 'https://crm.example', secret: 'teste' })).toBe('Falha de conexão ou tempo limite')
	})
})

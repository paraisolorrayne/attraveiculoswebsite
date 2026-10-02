import { describe, it, expect, vi } from 'vitest'

// O guard importa o login (next-auth) e o banco; aqui só a regra pura importa.
vi.mock('@/lib/admin-auth-supabase', () => ({ getCurrentAdmin: async () => null }))
vi.mock('@/lib/db', () => ({ db: {} }))

import { podeVerAgencia } from '@/lib/auth/guard-agencia'

const MH = 'id-mh'

describe('podeVerAgencia', () => {
	it('usuário de agência vê só a dele', () => {
		expect(podeVerAgencia({ role: 'agencia', agencia: { id: MH }, secoes: {} }, MH)).toBe(true)
		expect(podeVerAgencia({ role: 'agencia', agencia: { id: MH }, secoes: {} }, 'id-eb')).toBe(false)
		expect(podeVerAgencia({ role: 'agencia', agencia: null, secoes: {} }, MH)).toBe(false)
	})

	it('exceção de seção não vale para o papel agência', () => {
		expect(podeVerAgencia({ role: 'agencia', agencia: { id: MH }, secoes: { '/admin/agencia': true } }, 'id-eb')).toBe(false)
	})

	it('time da Attra vê qualquer agência; marketing não', () => {
		expect(podeVerAgencia({ role: 'admin', agencia: null, secoes: {} }, 'id-eb')).toBe(true)
		expect(podeVerAgencia({ role: 'operador', agencia: null, secoes: {} }, MH)).toBe(true)
		expect(podeVerAgencia({ role: 'marketing', agencia: null, secoes: {} }, MH)).toBe(false)
	})
})

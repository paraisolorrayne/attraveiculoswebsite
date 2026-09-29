import { describe, it, expect } from 'vitest'
import { deveRegistrarAcesso, INTERVALO_ACESSO_MS } from '@/lib/auth/ultimo-acesso'

const agora = new Date('2026-09-29T16:00:00-03:00')

describe('deveRegistrarAcesso', () => {
	it('registra quando nunca houve acesso', () => {
		expect(deveRegistrarAcesso(null, agora)).toBe(true)
	})

	it('não registra de novo dentro do intervalo', () => {
		expect(deveRegistrarAcesso(new Date(agora.getTime() - 60_000), agora)).toBe(false)
	})

	it('registra quando o último acesso gravado já passou do intervalo', () => {
		expect(deveRegistrarAcesso(new Date(agora.getTime() - INTERVALO_ACESSO_MS), agora)).toBe(true)
	})

	it('aceita o valor como string, como vem do driver em alguns caminhos', () => {
		expect(deveRegistrarAcesso('2026-08-03T14:47:00-03:00', agora)).toBe(true)
	})
})

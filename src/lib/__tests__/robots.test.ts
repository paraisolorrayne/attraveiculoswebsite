import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'

// /_next/ serve o CSS e o JS da página e as fotos otimizadas (/_next/image —
// 449 referências numa ficha de veículo). Bloqueado no robots.txt, o Googlebot
// renderiza a página sem estilo nem imagem; a orientação do Google é não
// bloquear recursos de renderização.
describe('robots.txt', () => {
	const regras = robots().rules
	const grupos = Array.isArray(regras) ? regras : [regras]

	it.each(grupos.map(g => [String(g.userAgent), g] as const))('%s pode buscar /_next/', (_ua, grupo) => {
		const disallow = [grupo.disallow ?? []].flat()
		expect(disallow.filter(d => d.startsWith('/_next'))).toEqual([])
	})

	it('continua bloqueando /admin/ e /api/ para Googlebot e Bingbot', () => {
		for (const ua of ['Googlebot', 'Bingbot']) {
			const g = grupos.find(x => x.userAgent === ua)!
			expect([g.disallow].flat()).toEqual(expect.arrayContaining(['/admin/', '/api/']))
		}
	})
})

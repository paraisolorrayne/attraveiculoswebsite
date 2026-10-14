import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { PAGINAS_LEGADAS, POSTS_WP_NA_RAIZ } from '@/lib/seo/urls-legadas'

const MAIN = join(__dirname, '..', '..', 'app', '(main)')

describe('urls legadas do WordPress', () => {
	it('nenhum post antigo colide com uma rota da raiz do site atual', () => {
		for (const slug of POSTS_WP_NA_RAIZ) {
			expect(existsSync(join(MAIN, slug)), slug).toBe(false)
			expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
		}
	})

	it('origem das páginas legadas não é rota viva, e o destino é', () => {
		for (const [origem, destino] of Object.entries(PAGINAS_LEGADAS)) {
			if (!origem.startsWith('/blog/')) {
				expect(existsSync(join(MAIN, origem.split('/')[1])), origem).toBe(false)
			}
			expect(existsSync(join(MAIN, destino.split('/')[1])), destino).toBe(true)
		}
	})
})

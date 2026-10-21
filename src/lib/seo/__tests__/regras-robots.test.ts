import { describe, expect, it } from 'vitest'
// O mesmo serializador que o Next usa para publicar /robots.txt: o teste lê o
// texto que vai ao ar, não o objeto.
import { resolveRobots } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data'
import { decidir, lerRobots } from '../../../../scripts/lib/robots-txt.mjs'
import { APIS_PUBLICAS, RESTRICOES, montarRobots, type PoliticaGptbot } from '../regras-robots'

const SITE = 'https://attraveiculos.com.br'

function publicado(politicaGptbot?: PoliticaGptbot) {
	const texto = resolveRobots(montarRobots({ siteUrl: SITE, politicaGptbot }))
	return { texto, robots: lerRobots(texto) }
}

const pode = (texto: string, agente: string, caminho: string) =>
	decidir(lerRobots(texto), agente, caminho).permitido

describe('leitor de robots.txt (RFC 9309)', () => {
	// Exemplos da documentação do Google sobre conflito de regras.
	it('a regra mais longa vence', () => {
		const t = 'User-agent: *\nAllow: /p\nDisallow: /\n'
		expect(pode(t, 'x', '/page')).toBe(true)
		expect(pode(t, 'x', '/outra')).toBe(false)
	})

	it('no empate, Allow vence', () => {
		expect(pode('User-agent: *\nAllow: /folder\nDisallow: /folder\n', 'x', '/folder/page')).toBe(true)
	})

	it('curinga e âncora de fim', () => {
		expect(pode('User-agent: *\nAllow: /page\nDisallow: /*.htm\n', 'x', '/page.htm')).toBe(false)
		const t = 'User-agent: *\nAllow: /$\nDisallow: /\n'
		expect(pode(t, 'x', '/')).toBe(true)
		expect(pode(t, 'x', '/page.htm')).toBe(false)
	})

	it('grupo com o nome do robô substitui o `*` inteiro, sem diferenciar maiúsculas', () => {
		const t = 'User-agent: *\nDisallow: /x\n\nUser-agent: MeuBot\nAllow: /\n'
		expect(pode(t, 'meubot', '/x')).toBe(true)
		expect(pode(t, 'outro', '/x')).toBe(false)
	})

	it('grupos repetidos do mesmo robô se somam', () => {
		const t = 'User-agent: a\nDisallow: /um\n\nUser-agent: a\nDisallow: /dois\n'
		expect(pode(t, 'a', '/um')).toBe(false)
		expect(pode(t, 'a', '/dois')).toBe(false)
	})
})

// A matriz da seção 5 do handoff de 21/10/2026, mais os casos que ele pediu à parte.
const PUBLICOS = [
	'/',
	'/veiculos',
	'/veiculos?marca=porsche',
	'/veiculo/lamborghini-temerario-2026-1148612',
	'/comprar/porsche/911',
	'/blog',
	'/llms.txt',
	'/sitemap.xml',
	'/sitemap-estoque.xml',
	'/api/llm/vehicles',
	'/api/llm/vehicles?format=text',
	'/api/vehicles/search?q=911',
	// Recursos de renderização: o `/*.json$` não pode pegá-los.
	'/_next/static/chunks/app/page.js',
	'/_next/static/css/app.css',
	'/_next/image?url=%2Fimages%2Fhero.jpg&w=1080&q=75',
	'/veiculos?_rsc=1b3ag',
	'/site.webmanifest',
]
const RESTRITOS = [
	'/admin/',
	'/admin/visitors',
	'/private/',
	'/api/qualquer-outra',
	'/api/vehicles',
	'/api/llm/gaps',
	'/api/llm/monitor',
	'/api/sessions/card/123',
	'/creative/vendido/municipios.json',
]

describe('robots.txt publicado', () => {
	const { texto, robots } = publicado()

	it.each(['OAI-SearchBot', 'ChatGPT-User', 'Googlebot', 'Bingbot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'OAI-AdsBot', 'robo-qualquer'])(
		'%s lê as páginas públicas e não as áreas restritas',
		agente => {
			for (const caminho of PUBLICOS) expect({ agente, caminho, ok: decidir(robots, agente, caminho).permitido }).toEqual({ agente, caminho, ok: true })
			for (const caminho of RESTRITOS) expect({ agente, caminho, ok: decidir(robots, agente, caminho).permitido }).toEqual({ agente, caminho, ok: false })
		},
	)

	it('os robôs da OpenAI e os de busca têm grupo próprio', () => {
		for (const agente of ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Googlebot', 'Googlebot-Image', 'Bingbot']) {
			expect(robots.grupos.some(g => g.agentes.includes(agente.toLowerCase()))).toBe(true)
		}
		// Sem campanha de anúncios no ChatGPT, o OAI-AdsBot segue o `*`.
		expect(decidir(robots, 'OAI-AdsBot', '/').grupo).toBe('*')
	})

	it('todo grupo repete as restrições, porque substitui o `*` inteiro', () => {
		for (const grupo of robots.grupos) {
			const bloqueios = grupo.regras.filter(r => r.tipo === 'disallow').map(r => r.caminho)
			expect({ agentes: grupo.agentes, faltam: RESTRICOES.filter(r => !bloqueios.includes(r)) })
				.toEqual({ agentes: grupo.agentes, faltam: [] })
		}
	})

	it('Googlebot-Image lê as imagens e não os JSON', () => {
		for (const caminho of ['/images/hero.jpg', '/images/marcas/porsche.png', '/foto.webp', '/_next/image?url=%2Fimages%2Fa.jpg&w=640&q=75']) {
			expect(decidir(robots, 'Googlebot-Image', caminho).permitido).toBe(true)
		}
		expect(decidir(robots, 'Googlebot-Image', '/creative/vendido/ufs.json').permitido).toBe(false)
		expect(decidir(robots, 'Googlebot-Image', '/admin/').permitido).toBe(false)
	})

	it('as exceções de API são só as duas públicas, sem a variante redundante com ?q=', () => {
		const liberadasEmApi = new Set(robots.grupos.flatMap(g => g.regras)
			.filter(r => r.tipo === 'allow' && r.caminho.startsWith('/api/'))
			.map(r => r.caminho))
		expect([...liberadasEmApi].sort()).toEqual([...APIS_PUBLICAS].sort())
	})

	it('anuncia o índice de sitemaps e não tem a linha Host', () => {
		expect(robots.sitemaps).toEqual([`${SITE}/sitemap.xml`])
		expect(texto).not.toMatch(/^host:/im)
		expect(robots.outras).toEqual([])
	})
})

describe('política do GPTBot', () => {
	it('liberado: mesmas regras do OAI-SearchBot', () => {
		const { robots } = publicado('liberado')
		for (const caminho of [...PUBLICOS, ...RESTRITOS]) {
			expect(decidir(robots, 'GPTBot', caminho).permitido).toBe(decidir(robots, 'OAI-SearchBot', caminho).permitido)
		}
	})

	it('bloqueado: nada para o GPTBot, e a busca do ChatGPT continua igual', () => {
		const { robots } = publicado('bloqueado')
		for (const caminho of PUBLICOS) {
			expect(decidir(robots, 'GPTBot', caminho).permitido).toBe(false)
			expect(decidir(robots, 'OAI-SearchBot', caminho).permitido).toBe(true)
			expect(decidir(robots, 'ChatGPT-User', caminho).permitido).toBe(true)
		}
	})
})

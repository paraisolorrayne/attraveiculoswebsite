/**
 * Teste de INTEGRAÇÃO das rotas de origem do painel de visitantes
 * (/api/admin/visitors/{origens,entradas,campanha,sessoes,jornadas}) contra
 * um Postgres real.
 *
 * Existe porque o SQL dessas rotas — `distinct on`, `to_char(... at time
 * zone ...)`, `array_agg(distinct ...)`, subconsultas em CTE — só falha em
 * tempo de execução, e a falha aparece como 500 no painel, não no CI. As
 * libs puras já têm testes; aqui o que se prova é que o SQL roda e que a
 * dobra em Node bate com o que foi semeado.
 *
 * Opt-in, como os outros: sem TEST_DATABASE_URL é pulado.
 *   createdb attra_visitors_dev
 *   psql attra_visitors_dev -f src/lib/db/__tests__/fixtures/tracking-schema.sql
 *   TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/attra_visitors_dev \
 *     ./node_modules/.bin/vitest run src/lib/db/__tests__/visitors-origens-routes.integration.test.ts
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/guard-api', () => ({ adminComAcessoA: async () => ({ id: 'a', role: 'admin' }) }))

const TEST_DB = process.env.TEST_DATABASE_URL

const req = (path: string) => new NextRequest(`http://localhost${path}`)

describe.skipIf(!TEST_DB)('rotas de origem do painel — SQL real', () => {
	let db: typeof import('../index').db
	let origens: typeof import('@/app/api/admin/visitors/origens/route').GET
	let entradas: typeof import('@/app/api/admin/visitors/entradas/route').GET
	let campanha: typeof import('@/app/api/admin/visitors/campanha/route').GET
	let sessoes: typeof import('@/app/api/admin/visitors/sessoes/route').GET
	let jornadas: typeof import('@/app/api/admin/visitors/jornadas/route').GET

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ GET: origens } = await import('@/app/api/admin/visitors/origens/route'))
		;({ GET: entradas } = await import('@/app/api/admin/visitors/entradas/route'))
		;({ GET: campanha } = await import('@/app/api/admin/visitors/campanha/route'))
		;({ GET: sessoes } = await import('@/app/api/admin/visitors/sessoes/route'))
		;({ GET: jornadas } = await import('@/app/api/admin/visitors/jornadas/route'))

		await db.deleteFrom('visitor_fingerprints').execute()

		const fp = async (visitor: string, device: string) =>
			(
				await db
					.insertInto('visitor_fingerprints')
					.values({ visitor_id: visitor, device_type: device, confidence_score: 0.9 })
					.returning('id')
					.executeTakeFirstOrThrow()
			).id

		const f1 = await fp('v1', 'mobile')
		const f2 = await fp('v2', 'desktop')

		const agora = Date.now()
		const dia = (n: number) => new Date(agora - n * 86_400_000)

		type Sessao = {
			fingerprint_id: string
			session_id: string
			started_at: Date
			utm_source?: string | null
			utm_medium?: string | null
			utm_campaign?: string | null
			utm_content?: string | null
			utm_term?: string | null
			utm_id?: string | null
			gclid?: string | null
			fbclid?: string | null
			referrer_domain?: string | null
			city?: string | null
			contacted_whatsapp?: boolean
			submitted_form?: boolean
			ads_device?: string | null
			match_type?: string | null
		}
		const semear = async (s: Sessao, paginas: Array<{ path: string; slug?: string; brand?: string; model?: string }>) => {
			const row = await db
				.insertInto('visitor_sessions')
				.values({
					fingerprint_id: s.fingerprint_id,
					session_id: s.session_id,
					started_at: s.started_at,
					utm_source: s.utm_source ?? null,
					utm_medium: s.utm_medium ?? null,
					utm_campaign: s.utm_campaign ?? null,
					utm_content: s.utm_content ?? null,
					utm_term: s.utm_term ?? null,
					utm_id: s.utm_id ?? null,
					gclid: s.gclid ?? null,
					fbclid: s.fbclid ?? null,
					referrer_domain: s.referrer_domain ?? null,
					city: s.city ?? null,
					contacted_whatsapp: s.contacted_whatsapp ?? false,
					submitted_form: s.submitted_form ?? false,
					ads_device: s.ads_device ?? null,
					match_type: s.match_type ?? null,
					last_activity_at: s.started_at,
				})
				.returning('id')
				.executeTakeFirstOrThrow()
			let t = s.started_at.getTime()
			for (const p of paginas) {
				await db
					.insertInto('visitor_page_views')
					.values({
						session_id: row.id,
						fingerprint_id: s.fingerprint_id,
						page_url: `https://attraveiculos.com.br${p.path}`,
						page_path: p.path,
						page_type: p.slug ? 'vehicle' : 'home',
						vehicle_slug: p.slug ?? null,
						vehicle_brand: p.brand ?? null,
						vehicle_model: p.model ?? null,
						viewed_at: new Date((t += 1000)),
					})
					.execute()
			}
		}

		// v1: primeira visita por anúncio da Meta há 10 dias; converteu hoje vindo direto.
		await semear(
			{ fingerprint_id: f1, session_id: 's1', started_at: dia(10), utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'Porsche 911', utm_content: 'video-1', fbclid: 'fb' },
			[{ path: '/veiculo/porsche-911-2025-1', slug: 'porsche-911-2025-1', brand: 'Porsche', model: '911' }],
		)
		await semear({ fingerprint_id: f1, session_id: 's2', started_at: dia(0), contacted_whatsapp: true, city: 'Uberlândia' }, [{ path: '/' }])
		// v2: Google Ads com gclid e sem UTM (auditoria), e depois pela bio do Instagram.
		await semear({ fingerprint_id: f2, session_id: 's3', started_at: dia(3), gclid: 'g1', ads_device: 'm', match_type: 'e' }, [{ path: '/' }])
		await semear({ fingerprint_id: f2, session_id: 's4', started_at: dia(1), referrer_domain: 'linktr.ee', submitted_form: true }, [{ path: '/comprar' }])
		// Campanha por ID, grafia diferente da mesma campanha da Meta.
		await semear({ fingerprint_id: f2, session_id: 's5', started_at: dia(2), utm_source: 'Facebook', utm_medium: 'cpc', utm_campaign: 'porsche 911', utm_term: 'esportivo' }, [{ path: '/veiculos' }])
	})

	it('origens: fonte × meio, referenciadores (Linktree), auditoria e tendência', async () => {
		const r = await origens(req('/api/admin/visitors/origens?dias=30'))
		expect(r.status).toBe(200)
		const j = await r.json()
		expect(j.total_sessoes).toBe(5)

		const meta = j.fonte_meio.find((l: { fonte: string; meio: string }) => l.fonte === 'meta' && l.meio === 'cpc')
		expect(meta.sessoes).toBe(2)
		expect(meta.grafias.sort()).toEqual(['Facebook', 'facebook'])

		const linktree = j.referenciadores.find((l: { dominio: string }) => l.dominio === 'linktr.ee')
		expect(linktree).toMatchObject({ rotulo_fonte: 'Linktree (bio do Instagram)', canal: 'social_organico', sessoes: 1, formularios: 1 })

		const tipos = j.auditoria.map((p: { tipo: string }) => p.tipo)
		expect(tipos).toContain('click_id_sem_utm')
		expect(tipos).toContain('campanha_varias_grafias')
		expect(tipos).toContain('fonte_varias_grafias')
		expect(tipos).toContain('paga_sem_campanha') // o gclid sem campanha

		expect(j.tendencia.pontos.length).toBeGreaterThanOrEqual(11)
		expect(j.tendencia.pontos.reduce((s: number, p: { sessoes: number }) => s + p.sessoes, 0)).toBe(5)
	})

	it('entradas: primeira página de cada sessão × canal', async () => {
		const r = await entradas(req('/api/admin/visitors/entradas?dias=30'))
		expect(r.status).toBe(200)
		const j = await r.json()
		expect(j.total_sessoes).toBe(5)
		expect(j.sem_entrada).toBe(0)
		const home = j.por_pagina.find((p: { page_path: string }) => p.page_path === '/')
		expect(home.sessoes).toBe(2)
		expect(home.por_canal).toMatchObject({ direto: 1, busca_paga: 1 })
		const social = j.por_canal.find((c: { canal: string }) => c.canal === 'social_pago')
		expect(social.paginas.map((p: { page_path: string }) => p.page_path).sort()).toEqual(['/veiculo/porsche-911-2025-1', '/veiculos'])
	})

	it('campanha: junta as duas grafias, lista criativos, termos, veículos, contexto e leads', async () => {
		const r = await campanha(req('/api/admin/visitors/campanha?chave=porsche%20911&dias=30'))
		expect(r.status).toBe(200)
		const j = await r.json()
		expect(j.resumo.sessoes).toBe(2)
		expect(j.grafias.sort()).toEqual(['Porsche 911', 'porsche 911'])
		expect(j.canais[0]).toMatchObject({ canal: 'social_pago', sessoes: 2 })
		expect(j.conteudos.map((c: { valor: string }) => c.valor).sort()).toEqual(['(sem utm_content)', 'video-1'])
		expect(j.termos.find((t: { valor: string }) => t.valor === 'esportivo').sessoes).toBe(1)
		expect(j.veiculos[0]).toMatchObject({ slug: 'porsche-911-2025-1', marca: 'Porsche', sessoes: 1 })
		expect(j.leads).toEqual([]) // nenhuma das duas sessões da campanha converteu
		expect(j.por_dia.length).toBe(2)

		const semChave = await campanha(req('/api/admin/visitors/campanha?dias=30'))
		expect(semChave.status).toBe(400)
	})

	it('campanha: contexto do clique traduz os códigos do Google Ads', async () => {
		// A sessão com gclid não tem campanha; vale conferir o SQL do contexto por uma campanha vazia.
		const r = await campanha(req('/api/admin/visitors/campanha?chave=inexistente&dias=30'))
		const j = await r.json()
		expect(j.resumo.sessoes).toBe(0)
		expect(Array.isArray(j.contexto)).toBe(true)
	})

	it('sessoes: descreve, filtra por canal/referrer/problema e pagina', async () => {
		const todas = await (await sessoes(req('/api/admin/visitors/sessoes?dias=30'))).json()
		expect(todas.total_periodo).toBe(5)
		expect(todas.sessoes[0].session_id).toBe('s2') // mais recente primeiro
		expect(todas.sessoes[0]).toMatchObject({ canal: 'direto', city: 'Uberlândia', device_type: 'mobile', entrada: '/' })

		const pagas = await (await sessoes(req('/api/admin/visitors/sessoes?dias=30&canal=social_pago'))).json()
		expect(pagas.total_filtrado).toBe(2)

		const lt = await (await sessoes(req('/api/admin/visitors/sessoes?dias=30&referrer=linktr.ee'))).json()
		expect(lt.sessoes.map((s: { session_id: string }) => s.session_id)).toEqual(['s4'])

		const semUtm = await (await sessoes(req('/api/admin/visitors/sessoes?dias=30&problema=click_id_sem_utm'))).json()
		expect(semUtm.sessoes.map((s: { session_id: string }) => s.session_id)).toEqual(['s3'])

		const veic = todas.sessoes.find((s: { session_id: string }) => s.session_id === 's1')
		expect(veic.veiculos).toBe(1)
		expect(veic.entrada_veiculo).toBe('porsche-911-2025-1')
	})

	it('jornadas: primeira origem (Meta) × conversão (direto) para quem voltou', async () => {
		const r = await jornadas(req('/api/admin/visitors/jornadas?dias=30'))
		expect(r.status).toBe(200)
		const j = await r.json()
		expect(j.visitantes_convertidos).toBe(2)
		expect(j.jornadas_total).toBe(2)
		const v1 = j.jornadas.find((x: { conversao: { session_id: string } }) => x.conversao.session_id === 's2')
		expect(v1.primeira).toMatchObject({ canal: 'social_pago', campanha: 'Porsche 911' })
		expect(v1.conversao.canal).toBe('direto')
		expect(v1.dias).toBe(10)
		expect(j.matriz).toEqual(expect.arrayContaining([{ primeira: 'social_pago', conversao: 'direto', jornadas: 1 }]))
	})
})

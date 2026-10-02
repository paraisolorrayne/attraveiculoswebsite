/**
 * Dados SINTÉTICOS para o ambiente local (área da agência e painel de
 * Visitantes). Nada aqui vem de produção.
 *
 *     npx tsx scripts/local/seed-agencia.ts
 *
 * Lê o DATABASE_URL do .env.local e SE RECUSA a rodar fora de um banco local
 * com "local" no nome — apaga e recria as sessões do banco que receber.
 *
 * Determinístico (semente fixa): rodar de novo gera os mesmos números, o que
 * ajuda a comparar a tela antes e depois de uma mudança.
 *
 * Logins criados (senha de teste: teste-local-123):
 *   admin@attra.local             — admin (vê tudo e a área de qualquer agência)
 *   mediahouse@webmotors.com.br   — agência Media House
 *   nayume.sousa@webmotors.com.br — agência Media House
 */
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SENHA_TESTE = 'teste-local-123'
const DIAS = 30
const TOTAL_SESSOES = 2500

function conferirBancoLocal(url: string | undefined): void {
	if (!url) throw new Error('DATABASE_URL ausente — crie o .env.local a partir do .env.local.example')
	const u = new URL(url)
	const hostLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)
	const nome = u.pathname.slice(1)
	if (!hostLocal || !nome.includes('local')) {
		throw new Error(`Recusado: ${u.hostname}/${nome} não é um banco local com "local" no nome. Este script apaga sessões.`)
	}
}

/** PRNG com semente (mulberry32): mesmos dados a cada execução. */
function aleatorio(semente: number) {
	let a = semente
	return () => {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const VEICULOS = [
	{ id: '1099157', slug: 'ferrari-296-2025-1099157', marca: 'Ferrari', modelo: '296 GTB', preco: 3490000 },
	{ id: '1062018', slug: 'ferrari-sf90-2024-1062018', marca: 'Ferrari', modelo: 'SF90 Stradale', preco: 4590000 },
	{ id: '1066415', slug: 'lamborghini-gallardo-2010-1066415', marca: 'Lamborghini', modelo: 'Gallardo', preco: 899000 },
	{ id: '916079', slug: 'mercedes-amg-gt-2025-916079', marca: 'Mercedes-Benz', modelo: 'AMG GT 63 S', preco: 1890000 },
	{ id: '1005112', slug: 'porsche-911-carrera-2025-1005112', marca: 'Porsche', modelo: '911 Carrera', preco: 929000 },
	{ id: '753398', slug: 'porsche-panamera-2023-753398', marca: 'Porsche', modelo: 'Panamera', preco: 799000 },
	{ id: '817434', slug: 'mclaren-artura-2023-817434', marca: 'McLaren', modelo: 'Artura', preco: 2290000 },
	{ id: '958456', slug: 'gmc-sierra-3500-2024-958456', marca: 'GMC', modelo: 'Sierra 3500 Denali', preco: 1290000 },
	{ id: '993245', slug: 'bmw-x5-2024-993245', marca: 'BMW', modelo: 'X5 xDrive50e', preco: 499000 },
	{ id: '1089519', slug: 'land-rover-discovery-2019-1089519', marca: 'Land Rover', modelo: 'Discovery', preco: 119000 },
]

const CIDADES = [
	['São Paulo', 'São Paulo'], ['Rio de Janeiro', 'Rio de Janeiro'], ['Belo Horizonte', 'Minas Gerais'],
	['Uberlândia', 'Minas Gerais'], ['Curitiba', 'Paraná'], ['Goiânia', 'Goiás'], ['Campinas', 'São Paulo'],
	['Brasília', 'Distrito Federal'], ['Niterói', 'Rio de Janeiro'], ['Ribeirão Preto', 'São Paulo'],
]

/** Origem de uma sessão. `peso` = fração das sessões. */
const ORIGENS = [
	{ nome: 'organico', peso: 0.45 },
	{ nome: 'mh-pmax', peso: 0.25 },
	{ nome: 'mh-search', peso: 0.1 },
	{ nome: 'mh-meta-site', peso: 0.08 },
	{ nome: 'mh-webmotors', peso: 0.02 },
	{ nome: 'eb-meta', peso: 0.1 },
] as const

/** Tempo até o 1º clique, na distribuição medida em produção (02/10/2026). */
const FAIXAS_CLIQUE: Array<[number, number, number]> = [
	[0.23, 0, 3], [0.22, 3, 10], [0.13, 10, 30], [0.17, 30, 60], [0.17, 60, 180], [0.08, 180, 600],
]

async function main() {
	conferirBancoLocal(process.env.DATABASE_URL)
	const { db } = await import('../../src/lib/db')
	const { sql } = await import('kysely')
	const bcrypt = (await import('bcryptjs')).default
	const r = aleatorio(20261002)
	const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(r() * lista.length)]

	console.log('==> limpando dados de visita e de agência do banco local')
	await db.deleteFrom('whatsapp_clicks').execute()
	await db.deleteFrom('visitor_fingerprints').execute()

	console.log('==> agências (os marcadores da Media House vêm da migration 20261003)')
	await sql`insert into agencias (nome, slug, prefixos) values ('EB', 'eb', '{[eb]}') on conflict (slug) do nothing`.execute(db)
	const mh = (await db.selectFrom('agencias').select('id').where('slug', '=', 'media-house').executeTakeFirstOrThrow()).id
	// Campanha da Media House no GAM da WebMotors, com o marcador va- no nome.
	const WEBMOTORS_GAM = 'va-webmotors-gam-set26'

	console.log('==> usuários de teste')
	const hash = await bcrypt.hash(SENHA_TESTE, 10)
	const usuarios = [
		{ email: 'admin@attra.local', name: 'Admin Local', role: 'admin', agencia_id: null },
		{ email: 'mediahouse@webmotors.com.br', name: 'Media House', role: 'agencia', agencia_id: mh },
		{ email: 'nayume.sousa@webmotors.com.br', name: 'Nayume Sousa', role: 'agencia', agencia_id: mh },
	]
	for (const u of usuarios) {
		await sql`
			insert into admin_users (id, email, name, role, is_active, password_hash, agencia_id)
			values (gen_random_uuid(), ${u.email}, ${u.name}, ${u.role}::admin_role, true, ${hash}, ${u.agencia_id}::uuid)
			on conflict (email) do update set role = excluded.role, password_hash = excluded.password_hash,
			  agencia_id = excluded.agencia_id, is_active = true
		`.execute(db)
	}

	console.log(`==> ${TOTAL_SESSOES} sessões em ${DIAS} dias`)
	const agora = Date.now()
	let cliques = 0
	for (let i = 0; i < TOTAL_SESSOES; i++) {
		let acc = 0
		const sorteio = r()
		const origem = ORIGENS.find(o => (acc += o.peso) >= sorteio)?.nome ?? 'organico'
		const celular = r() < 0.82
		const fp = await db
			.insertInto('visitor_fingerprints')
			.values({ visitor_id: `local-${i}`, confidence_score: 0.9, device_type: celular ? 'mobile' : 'desktop' } as never)
			.returning('id')
			.executeTakeFirstOrThrow()

		const inicio = new Date(agora - r() * DIAS * 86_400_000)
		const [cidade, estado] = escolher(CIDADES)
		const s: Record<string, unknown> = {
			fingerprint_id: fp.id,
			session_id: `${inicio.getTime()}-local${i.toString(36)}`,
			started_at: inicio,
			last_activity_at: inicio,
			city: cidade,
			region: estado,
			country_code: 'BR',
			ip_address: `203.0.113.${(i % 254) + 1}`,
		}
		if (origem === 'mh-pmax') {
			Object.assign(s, {
				utm_source: 'google', utm_medium: 'cpc', utm_id: '24295047322', gclid: `pmax-${i}`,
				// Metade sem nome — o caso real da PMax desde 29/09.
				utm_campaign: r() < 0.5 ? 'va-pmax-nucleo-set26' : null,
				referrer_domain: r() < 0.6 ? 'googleads.g.doubleclick.net' : 'abc.safeframe.googlesyndication.com',
				ads_network: 'x', ads_device: celular ? 'm' : 'c',
			})
		} else if (origem === 'mh-search') {
			Object.assign(s, {
				utm_source: 'google', utm_medium: 'cpc', utm_id: '24283864992', utm_campaign: 'va-search-marca-set26',
				gclid: `search-${i}`, utm_term: escolher(['ferrari 296', 'porsche 911 usado', 'carros de luxo', 'attra veiculos']),
				match_type: escolher(['e', 'p', 'b']), ads_network: 'g', referrer_domain: 'www.google.com',
			})
		} else if (origem === 'mh-meta-site') {
			Object.assign(s, {
				utm_source: escolher(['facebook', 'instagram']), utm_medium: 'paid_social', utm_id: '120241000000000001',
				utm_campaign: '[VA][MediaHouse][Leads][Site]', fbclid: `fb-${i}`,
				utm_content: escolher(['video-g63-15s', 'carrossel-estoque-set', 'foto-ferrari-296']),
				utm_term: escolher(['Feed', 'Stories', 'Reels']),
			})
		} else if (origem === 'mh-webmotors') {
			Object.assign(s, { utm_source: 'webmotors', utm_medium: 'cpc', utm_campaign: WEBMOTORS_GAM, referrer_domain: 'www.webmotors.com.br' })
		} else if (origem === 'eb-meta') {
			Object.assign(s, {
				utm_source: 'facebook', utm_medium: 'paid_social', utm_id: '120240538111140043',
				utm_campaign: '[EB] [SITE] Visitas ao site', fbclid: `eb-${i}`, utm_content: 'video-loja-rondon',
			})
		} else {
			Object.assign(s, { referrer_domain: escolher(['www.google.com', 'www.google.com', 'l.instagram.com', 'linktr.ee', null]) })
		}

		// Páginas da visita.
		const nPaginas = 1 + Math.floor(r() * r() * 6)
		const paginas: Array<{ path: string; veiculo: (typeof VEICULOS)[number] | null }> = [
			{ path: r() < 0.6 ? '/' : '/veiculos', veiculo: null },
		]
		for (let p = 1; p < nPaginas; p++) {
			const v = escolher(VEICULOS)
			paginas.push(r() < 0.65 ? { path: `/veiculo/${v.slug}`, veiculo: v } : { path: '/veiculos', veiculo: null })
		}

		// Clique no WhatsApp em ~9% das sessões, com o tempo medido.
		let clique: { segundos: number; path: string; veiculo: (typeof VEICULOS)[number] | null } | null = null
		if (r() < 0.09) {
			let a = 0
			const t = r()
			const [, de, ate] = FAIXAS_CLIQUE.find(f => (a += f[0]) >= t) ?? FAIXAS_CLIQUE[0]
			const segundos = de + r() * (ate - de)
			// Clique acidental cai no botão flutuante da entrada; o resto, onde a pessoa estava.
			const onde = segundos < 3 ? paginas[0] : paginas[paginas.length - 1]
			clique = { segundos, path: onde.path, veiculo: onde.veiculo }
		}

		const duracao = Math.round(20 + r() * 400)
		Object.assign(s, {
			page_views_count: paginas.length,
			duration_seconds: duracao,
			last_activity_at: new Date(inicio.getTime() + duracao * 1000),
			contacted_whatsapp: clique !== null,
		})
		const sessao = await db.insertInto('visitor_sessions').values(s as never).returning('id').executeTakeFirstOrThrow()

		let t = inicio.getTime()
		for (const p of paginas) {
			await db
				.insertInto('visitor_page_views')
				.values({
					session_id: sessao.id,
					fingerprint_id: fp.id,
					page_url: `https://attraveiculos.com.br${p.path}`,
					page_path: p.path,
					page_type: p.veiculo ? 'vehicle' : p.path === '/' ? 'home' : 'listing',
					vehicle_slug: p.veiculo?.slug ?? null,
					vehicle_brand: p.veiculo?.marca ?? null,
					vehicle_model: p.veiculo?.modelo ?? null,
					vehicle_price: p.veiculo?.preco ?? null,
					time_on_page_seconds: Math.round(5 + r() * 90),
					scroll_depth_percent: Math.round(r() * 100),
					clicked_whatsapp: clique !== null && clique.path === p.path,
					viewed_at: new Date(t),
				} as never)
				.execute()
			t += Math.round(10 + r() * 60) * 1000
		}

		if (clique) {
			cliques++
			await sql`
				insert into whatsapp_clicks (session_db_id, clicked_at, page_path, vehicle_id)
				values (${sessao.id}::uuid, ${new Date(inicio.getTime() + clique.segundos * 1000)}, ${clique.path}, ${clique.veiculo?.id ?? null})
			`.execute(db)
		}
	}

	console.log(`ok: ${TOTAL_SESSOES} sessões, ${cliques} com clique no WhatsApp.`)
	console.log(`    Logins (senha ${SENHA_TESTE}): ${usuarios.map(u => u.email).join(', ')}`)
	await db.destroy()
}

main().catch(e => {
	console.error(e instanceof Error ? e.message : e)
	process.exit(1)
})

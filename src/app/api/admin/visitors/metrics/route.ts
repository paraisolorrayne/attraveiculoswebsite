import { NextRequest, NextResponse } from 'next/server'
import { sql, type RawBuilder } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import {
	chaveCampanha,
	classificarCanal,
	normalizarCampanha,
	normalizarFonte,
	corCanal,
	rotuloCanal,
	SEM_CAMPANHA,
	VALORES_NULOS_LISTA,
	type CanalTrafego,
} from '@/lib/traffic-channel'

// Métricas do /admin/visitors por CANAL e CAMPANHA.
//
// Estratégia: a agregação pesada acontece NO BANCO (GROUP BY sobre as colunas cruas de
// atribuição); o Node só dobra esses grupos em canais chamando `classificarCanal`, que é
// TypeScript e não roda em SQL. Com isso nenhuma linha de sessão trafega para cá — o que
// chega são dezenas de linhas já somadas — e a soma dos canais bate exatamente com o total
// do período, porque canais e totais saem do MESMO conjunto de grupos.

// Período padrão do painel. `dias = 0` significa "toda a história".
const DIAS_PADRAO = 30
const DIAS_MAX = 730
const LIMITE_CAMPANHAS = 15
const LIMITE_LISTAS = 10

// Lista de "valores que significam vazio" vinda da lib de canal — ela é a fonte de verdade da
// classificação, então é ela quem define o que é vazio, aqui também.
const VAZIOS_SQL = sql.join(VALORES_NULOS_LISTA.map((v) => sql`${v}`))

/**
 * Aplica no SQL o MESMO saneamento que `limpar()` faz na lib: apara, e trata '(not set)',
 * '(none)', 'null', 'undefined', 'direct', '-' como ausência de valor.
 *
 * Sem isso a rota e a lib discordavam: para o SQL `utm_source = '(not set)'` era um valor
 * presente, para a lib era vazio. A mesma sessão saía como "direto" nesta tabela e como
 * "assistente de IA" na tabela de receita (que passa a linha crua para a lib). Uma tela, duas
 * verdades. Saneando aqui existe UMA definição — e de quebra o GROUP BY agrupa toda a sujeira
 * numa linha só em vez de espalhá-la.
 */
function saneado(coluna: RawBuilder<unknown>) {
	return sql<string | null>`nullif(
		case when lower(btrim(${coluna})) in (${VAZIOS_SQL}) then null else btrim(${coluna}) end,
		''
	)`
}

interface GrupoAtribuicao {
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	tem_gclid: boolean
	tem_fbclid: boolean
	tem_ttclid: boolean
	referrer_domain: string | null
	sessoes: number
	whatsapp: number
	formularios: number
	sessoes_com_veiculo: number
	veiculos_distintos: number
	sessoes_com_duracao: number
	duracao_total: number
}

interface Acumulado {
	sessoes: number
	whatsapp: number
	formularios: number
	sessoes_com_veiculo: number
	veiculos_distintos: number
	sessoes_com_duracao: number
	duracao_total: number
}

function novoAcumulado(): Acumulado {
	return {
		sessoes: 0,
		whatsapp: 0,
		formularios: 0,
		sessoes_com_veiculo: 0,
		veiculos_distintos: 0,
		sessoes_com_duracao: 0,
		duracao_total: 0,
	}
}

function acumular(alvo: Acumulado, g: GrupoAtribuicao): void {
	alvo.sessoes += g.sessoes
	alvo.whatsapp += g.whatsapp
	alvo.formularios += g.formularios
	alvo.sessoes_com_veiculo += g.sessoes_com_veiculo
	alvo.veiculos_distintos += g.veiculos_distintos
	alvo.sessoes_com_duracao += g.sessoes_com_duracao
	alvo.duracao_total += g.duracao_total
}

/**
 * Duração só existe para sessões que foram encerradas. Enquanto `duration_seconds` for nulo
 * (o caso de 100% do histórico), devolvemos `null` em vez de 0: o painel mostra travessão em
 * vez de inventar um número.
 */
function duracaoMedia(a: Acumulado): number | null {
	return a.sessoes_com_duracao > 0 ? Math.round(a.duracao_total / a.sessoes_com_duracao) : null
}

/** Chave do item mais frequente — usada para rotular a campanha com seu canal/fonte dominante. */
function maisFrequente(contagem: Map<string, number>, padrao: string): string {
	let melhor = padrao
	let maior = -1
	for (const [chave, n] of contagem) {
		if (n > maior) {
			melhor = chave
			maior = n
		}
	}
	return melhor
}

export async function GET(request: NextRequest) {
	try {
		// Mesma regra da página: papel OU seção concedida ao usuário.
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const diasBruto = Number(new URL(request.url).searchParams.get('dias'))
		const dias =
			Number.isFinite(diasBruto) && diasBruto >= 0 && diasBruto <= DIAS_MAX
				? Math.floor(diasBruto)
				: DIAS_PADRAO

		const desde = dias > 0 ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000) : null

		// Condição de período reaproveitada por todas as queries: com `dias = 0` vira `true`,
		// então o SQL continua válido sem montar/desmontar cláusula WHERE.
		const noPeriodo = desde ? sql`s.started_at >= ${desde}` : sql`true`

		// Sessão "viu veículo": contada pelo PATH da página (/veiculo/<slug>, singular), não pela
		// coluna vehicles_viewed. A coluna ficou zerada em todo o histórico por causa do bug de
		// classificação da rota; o path funciona retroativamente.
		const veiculosPorSessao = sql`
			select pv.session_id, count(distinct pv.page_path)::int as veiculos
			from visitor_page_views pv
			where pv.page_path like '/veiculo/%'
			group by pv.session_id
		`

		const [grupos, totaisExtras, veiculos, coberturaVeiculos, cidades, midiaPaga, marcacaoPaga, contextoClique] = await Promise.all([
			sql<GrupoAtribuicao>`
				with veic as (${veiculosPorSessao})
				select
					${saneado(sql`s.utm_source`)} as utm_source,
					${saneado(sql`s.utm_medium`)} as utm_medium,
					-- Nome da campanha, com queda para o ID. O Google não tem código
					-- automático para o nome — só utm_id={campaignid} —, então uma
					-- campanha bem marcada pelo ID cairia em "(não marcada)" se
					-- exigíssemos o nome. Aqui ela vira "campanha #123456", que separa
					-- uma da outra, que é o que o relatório precisa.
					coalesce(
						${saneado(sql`s.utm_campaign`)},
						case when nullif(btrim(s.utm_id), '') is not null
						     then 'campanha #' || btrim(s.utm_id) end,
						''
					) as utm_campaign,
					(${saneado(sql`s.gclid`)} is not null) as tem_gclid,
					(${saneado(sql`s.fbclid`)} is not null) as tem_fbclid,
					(${saneado(sql`s.ttclid`)} is not null) as tem_ttclid,
					-- O referrer vai INTEIRO para a lib, mesmo com utm_source preenchido. A versão
					-- anterior o anulava quando havia utm_source, o que só funcionaria se "há
					-- utm_source" significasse a mesma coisa aqui e na lib — e não significava.
					-- Quem decide se o referrer conta é classificarCanal, uma definição só.
					${saneado(sql`s.referrer_domain`)} as referrer_domain,
					count(*)::int as sessoes,
					(count(*) filter (where s.contacted_whatsapp))::int as whatsapp,
					(count(*) filter (where s.submitted_form))::int as formularios,
					(count(*) filter (
						where coalesce(v.veiculos, 0) > 0 or coalesce(s.vehicles_viewed, 0) > 0
					))::int as sessoes_com_veiculo,
					-- VEÍCULOS DIFERENTES por sessão. Duas métricas moravam nesta coluna: v.veiculos
					-- conta veículos DISTINTOS (path distinto) e s.vehicles_viewed é um contador que
					-- sobe a cada abertura de página, mesmo do mesmo carro. Com greatest() entre as
					-- duas, a sessão que abriu o mesmo Porsche 4 vezes valia 4 hoje e 1 no histórico
					-- (coluna zerada): a coluna do painel mudaria de significado no dia do deploy.
					-- Ficou a definição comparável com o histórico — veículos distintos. A coluna
					-- velha entra limitada a 1 porque, sem detalhe de page view, ela só prova que ao
					-- menos UM veículo foi aberto; assim ela nunca reintroduz a contagem por abertura.
					coalesce(sum(greatest(
						coalesce(v.veiculos, 0),
						least(coalesce(s.vehicles_viewed, 0), 1)
					)), 0)::int as veiculos_distintos,
					count(s.duration_seconds)::int as sessoes_com_duracao,
					coalesce(sum(s.duration_seconds), 0)::int as duracao_total
				from visitor_sessions s
				left join veic v on v.session_id = s.id
				where ${noPeriodo}
				group by 1, 2, 3, 4, 5, 6, 7
			`.execute(db),

			// Só o que não dá para dobrar a partir dos grupos sem contar em dobro.
			sql<{ visitantes: number; page_views: number }>`
				select
					count(distinct s.fingerprint_id)::int as visitantes,
					coalesce(sum(s.page_views_count), 0)::int as page_views
				from visitor_sessions s
				where ${noPeriodo}
			`.execute(db),

			sql<{
				slug: string
				marca: string | null
				modelo: string | null
				views: number
				sessoes: number
			}>`
				select
					pv.vehicle_slug as slug,
					max(pv.vehicle_brand) as marca,
					max(pv.vehicle_model) as modelo,
					count(*)::int as views,
					count(distinct pv.session_id)::int as sessoes
				from visitor_page_views pv
				join visitor_sessions s on s.id = pv.session_id
				where ${noPeriodo} and pv.vehicle_slug is not null
				group by pv.vehicle_slug
				order by views desc, sessoes desc
				limit ${LIMITE_LISTAS}
			`.execute(db),

			// Honestidade do "Top veículos": quantas visualizações de página de veículo ficaram
			// sem slug (page views gravados antes da correção da captura).
			sql<{ com_slug: number; sem_slug: number }>`
				select
					(count(*) filter (where pv.vehicle_slug is not null))::int as com_slug,
					(count(*) filter (where pv.vehicle_slug is null))::int as sem_slug
				from visitor_page_views pv
				join visitor_sessions s on s.id = pv.session_id
				where ${noPeriodo} and (pv.page_path like '/veiculo/%' or pv.page_type = 'vehicle')
			`.execute(db),

			sql<{ cidade: string; regiao: string | null; sessoes: number; whatsapp: number }>`
				select
					coalesce(nullif(btrim(s.city), ''), '(sem cidade)') as cidade,
					max(s.region) as regiao,
					count(*)::int as sessoes,
					(count(*) filter (where s.contacted_whatsapp))::int as whatsapp
				from visitor_sessions s
				where ${noPeriodo}
				group by 1
				order by sessoes desc
				limit ${LIMITE_LISTAS}
			`.execute(db),

			// Detalhe da mídia paga: campanha → grupo/anúncio → termo. É o recorte que
			// o time de mídia usa para decidir o que pausar; o nível de campanha
			// sozinho não diz QUAL anúncio traz conversa.
			sql<{ canal_fonte: string; campanha: string; grupo: string; conteudo: string; termo: string; sessoes: number; whatsapp: number }>`
				select
					lower(btrim(coalesce(s.utm_source, ''))) as canal_fonte,
					-- Nome da campanha, ou o ID dela, ou "não marcada" — nessa ordem.
					--
					-- O Google NÃO tem código automático para o nome da campanha, só
					-- para o ID (utm_id={campaignid}). Sem esta queda, toda campanha
					-- corretamente marcada com o ID apareceria como "(não marcada)",
					-- que é o oposto da verdade: o dado chegou, só não é um nome.
					coalesce(
						nullif(btrim(s.utm_campaign), ''),
						case when nullif(btrim(s.utm_id), '') is not null
						     then 'campanha #' || btrim(s.utm_id) end,
						'(não marcada)'
					) as campanha,
					coalesce(nullif(btrim(s.adset_id), ''), '(não marcado)') as grupo,
					coalesce(nullif(btrim(s.utm_content), ''), '(não marcado)') as conteudo,
					coalesce(nullif(btrim(s.utm_term), ''), '(não marcado)') as termo,
					count(*)::int as sessoes,
					(count(*) filter (where s.contacted_whatsapp))::int as whatsapp
				from visitor_sessions s
				where ${noPeriodo}
				  and (s.utm_medium ilike '%cpc%' or s.utm_medium ilike '%ppc%'
				       or s.utm_medium ilike '%paid%' or s.gclid is not null or s.fbclid is not null)
				group by 1, 2, 3, 4, 5
				order by sessoes desc
				limit ${LIMITE_LISTAS}
			`.execute(db),

			// Diagnóstico da MARCAÇÃO por plataforma: quantas visitas pagas chegam sem
			// nome de campanha. É isso que revela um modelo de rastreamento mal
			// configurado (ex.: custom parameter do Google Ads não definido na campanha,
			// que chega vazio e joga tudo em "(não marcada)").
			sql<{ fonte: string; sessoes: number; com_campanha: number; com_conteudo: number; com_termo: number; com_id: number; com_grupo: number; com_matchtype: number; com_device: number; com_network: number }>`
				select
					coalesce(nullif(lower(btrim(s.utm_source)), ''), '(sem fonte)') as fonte,
					count(*)::int as sessoes,
					-- Campanha identificada = nome OU id. O que importa para o
					-- relatório é conseguir separar uma campanha da outra; o nome é
					-- conforto, o identificador é o requisito.
					(count(*) filter (
						where nullif(btrim(s.utm_campaign), '') is not null
						   or nullif(btrim(s.utm_id), '') is not null
					))::int as com_campanha,
					(count(*) filter (where nullif(btrim(s.utm_content), '') is not null))::int as com_conteudo,
					(count(*) filter (where nullif(btrim(s.utm_term), '') is not null))::int as com_termo,
					(count(*) filter (where nullif(btrim(s.utm_id), '') is not null))::int as com_id,
					(count(*) filter (where nullif(btrim(s.adset_id), '') is not null))::int as com_grupo,
					(count(*) filter (where s.match_type is not null))::int as com_matchtype,
					(count(*) filter (where s.ads_device is not null))::int as com_device,
					(count(*) filter (where s.ads_network is not null))::int as com_network
				from visitor_sessions s
				where ${noPeriodo}
				  and (s.utm_medium ilike '%cpc%' or s.utm_medium ilike '%ppc%'
				       or s.utm_medium ilike '%paid%' or s.gclid is not null or s.fbclid is not null)
				group by 1
				order by sessoes desc
			`.execute(db),

			// Contexto do CLIQUE pago: dispositivo, tipo de correspondência e rede.
			//
			// Três recortes independentes num único ida-e-volta, e não o cruzamento
			// dos três: cruzado, 3x3x4 gera dezenas de linhas com duas sessões cada,
			// onde nenhuma taxa significa nada. Separado, cada linha responde uma
			// pergunta que muda decisão — "ampla converte menos que exata?",
			// "celular converte menos que computador?".
			sql<{ dimensao: string; valor: string; sessoes: number; whatsapp: number }>`
				select 'device' as dimensao,
				       coalesce(s.ads_device, '(não informado)') as valor,
				       count(*)::int as sessoes,
				       (count(*) filter (where s.contacted_whatsapp))::int as whatsapp
				from visitor_sessions s
				where ${noPeriodo} and ${sql`(s.utm_medium ilike '%cpc%' or s.utm_medium ilike '%ppc%'
				      or s.utm_medium ilike '%paid%' or s.gclid is not null or s.fbclid is not null)`}
				group by 2

				union all

				select 'matchtype',
				       coalesce(s.match_type, '(não informado)'),
				       count(*)::int,
				       (count(*) filter (where s.contacted_whatsapp))::int
				from visitor_sessions s
				where ${noPeriodo} and ${sql`(s.utm_medium ilike '%cpc%' or s.utm_medium ilike '%ppc%'
				      or s.utm_medium ilike '%paid%' or s.gclid is not null or s.fbclid is not null)`}
				group by 2

				union all

				select 'network',
				       coalesce(s.ads_network, '(não informado)'),
				       count(*)::int,
				       (count(*) filter (where s.contacted_whatsapp))::int
				from visitor_sessions s
				where ${noPeriodo} and ${sql`(s.utm_medium ilike '%cpc%' or s.utm_medium ilike '%ppc%'
				      or s.utm_medium ilike '%paid%' or s.gclid is not null or s.fbclid is not null)`}
				group by 2

				order by 1, 3 desc
			`.execute(db),
		])

		// ---- Dobra dos grupos crus em canais e campanhas ----
		const porCanal = new Map<CanalTrafego, Acumulado>()
		// Chaveado por `chaveCampanha` (caixa unificada) para que "Black Friday" e "black friday"
		// não virem duas linhas; `rotulos` guarda as grafias originais para exibir a mais usada.
		const porCampanha = new Map<
			string,
			{
				acc: Acumulado
				rotulos: Map<string, number>
				canais: Map<string, number>
				fontes: Map<string, number>
			}
		>()
		const totalGeral = novoAcumulado()

		for (const g of grupos.rows) {
			// `classificarCanal` só olha presença dos click ids, não o valor — o GROUP BY devolve
			// booleano justamente para não explodir a cardinalidade com ids únicos.
			const atribuicao = {
				utm_source: g.utm_source,
				utm_medium: g.utm_medium,
				utm_campaign: g.utm_campaign,
				gclid: g.tem_gclid ? '1' : null,
				fbclid: g.tem_fbclid ? '1' : null,
				ttclid: g.tem_ttclid ? '1' : null,
				referrer_domain: g.referrer_domain,
			}

			const canal = classificarCanal(atribuicao)
			acumular(totalGeral, g)

			const alvoCanal = porCanal.get(canal) ?? novoAcumulado()
			acumular(alvoCanal, g)
			porCanal.set(canal, alvoCanal)

			const chave = chaveCampanha(g.utm_campaign)
			if (chave !== SEM_CAMPANHA) {
				const alvo = porCampanha.get(chave) ?? {
					acc: novoAcumulado(),
					rotulos: new Map<string, number>(),
					canais: new Map<string, number>(),
					fontes: new Map<string, number>(),
				}
				acumular(alvo.acc, g)
				// A mesma campanha pode aparecer com marcações diferentes (Google/google, com e sem
				// medium): o canal, a fonte e a grafia exibidos são os que respondem por mais sessões.
				const rotulo = normalizarCampanha(g.utm_campaign)
				alvo.rotulos.set(rotulo, (alvo.rotulos.get(rotulo) ?? 0) + g.sessoes)
				alvo.canais.set(canal, (alvo.canais.get(canal) ?? 0) + g.sessoes)
				const fonte = normalizarFonte(atribuicao)
				alvo.fontes.set(fonte, (alvo.fontes.get(fonte) ?? 0) + g.sessoes)
				porCampanha.set(chave, alvo)
			}
		}

		const canais = [...porCanal.entries()]
			.map(([canal, a]) => ({
				canal,
				rotulo: rotuloCanal(canal),
				cor: corCanal(canal),
				sessoes: a.sessoes,
				whatsapp: a.whatsapp,
				formularios: a.formularios,
				sessoes_com_veiculo: a.sessoes_com_veiculo,
				veiculos_distintos: a.veiculos_distintos,
				sessoes_com_duracao: a.sessoes_com_duracao,
				duracao_media_segundos: duracaoMedia(a),
			}))
			.sort((a, b) => b.sessoes - a.sessoes)

		const campanhas = [...porCampanha.entries()]
			.map(([chave, dados]) => {
				const canal = maisFrequente(dados.canais, 'outro') as CanalTrafego
				return {
					// Exibe a grafia original mais usada, não a chave em minúsculas.
					campanha: maisFrequente(dados.rotulos, chave),
					canal,
					rotulo_canal: rotuloCanal(canal),
					cor_canal: corCanal(canal),
					fonte: maisFrequente(dados.fontes, ''),
					sessoes: dados.acc.sessoes,
					whatsapp: dados.acc.whatsapp,
					formularios: dados.acc.formularios,
					sessoes_com_veiculo: dados.acc.sessoes_com_veiculo,
				}
			})
			.sort((a, b) => b.sessoes - a.sessoes)

		const sessoesComCampanha = campanhas.reduce((s, c) => s + c.sessoes, 0)

		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			resumo: {
				sessoes: totalGeral.sessoes,
				visitantes: totaisExtras.rows[0]?.visitantes ?? 0,
				page_views: totaisExtras.rows[0]?.page_views ?? 0,
				whatsapp: totalGeral.whatsapp,
				formularios: totalGeral.formularios,
				sessoes_com_veiculo: totalGeral.sessoes_com_veiculo,
				veiculos_distintos: totalGeral.veiculos_distintos,
				sessoes_com_duracao: totalGeral.sessoes_com_duracao,
				duracao_media_segundos: duracaoMedia(totalGeral),
			},
			canais,
			campanhas: campanhas.slice(0, LIMITE_CAMPANHAS),
			campanhas_total: campanhas.length,
			sessoes_sem_campanha: totalGeral.sessoes - sessoesComCampanha,
			veiculos: veiculos.rows,
			// Diagnóstico do Top veículos: enquanto `sem_slug` for a maioria, a lista é parcial.
			veiculos_cobertura: coberturaVeiculos.rows[0] ?? { com_slug: 0, sem_slug: 0 },
			cidades: cidades.rows,
			midia_paga: midiaPaga.rows,
			contexto_clique: contextoClique.rows,
			marcacao_paga: marcacaoPaga.rows,
		})
	} catch (error) {
		console.error('[Visitors Metrics API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

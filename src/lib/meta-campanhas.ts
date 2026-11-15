/**
 * Os anúncios da Meta dentro do quadro de campanhas do Marketing (14/11/2026).
 *
 * O quadro era digitado à mão. Aqui os anúncios da conta viram cards:
 *
 *   campanha da Meta  →  campanha do quadro (meta_campaign_id)
 *   carro anunciado   →  um card, com os ids dos anúncios dele (meta_ad_ids)
 *
 * O que a Meta NÃO sabe é por que um anúncio saiu do ar (vendeu ou não
 * performou). Por isso a sincronia nunca move card de coluna: ela cria o card
 * do anúncio novo em "Publicada" e marca `meta_no_ar`. Quem encerra, e diz o
 * motivo, continua sendo a pessoa. Card publicado com `meta_no_ar = false`
 * aparece no quadro com o aviso "Pausado na Meta".
 *
 * Só referência: nenhuma imagem do anúncio é baixada nem guardada.
 */
import { db } from '@/lib/db'
import { anunciosDaMeta, metaConfigurada, type AnuncioDaMeta } from '@/lib/meta-ads'

/** "[VIDEO] Porsche 911 Turbo S 2022 | Gabriel" → "Porsche 911 Turbo S 2022". */
export function carroDoAnuncio(nome: string): string {
	const limpo = nome
		.replace(/^(\s*\[[^\]]*\])+/, '')
		.split('|')[0]
		.replace(/\s+/g, ' ')
		.trim()
	return limpo || nome.trim()
}

/** Chave de comparação: sem acento, sem caixa, sem pontuação. */
export function chaveDoNome(nome: string): string {
	return nome
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

export interface CampanhaDoQuadro {
	id: string
	meta_campaign_id: string | null
}

export interface CardDoQuadro {
	id: string
	campaign_id: string
	vehicle_name: string
	status: string
	meta_ad_ids: string[]
}

export interface Plano {
	/** Campanhas da Meta que ainda não existem no quadro. */
	campanhas: { metaId: string; nome: string }[]
	criar: { metaCampanhaId: string; nome: string; notas: string | null; adIds: string[]; desde: string | null; noAr: boolean; gasto: number | null }[]
	atualizar: { id: string; adIds: string[]; noAr: boolean; gasto: number | null }[]
}

/**
 * Decide o que gravar, sem tocar no banco (testável).
 *
 * Os anúncios são agrupados por campanha + carro. Cada grupo procura o card
 * dele nesta ordem: o que já tem um dos ids; o de mesmo nome na campanha
 * ligada; um card digitado à mão, ainda publicado, com o mesmo nome (para não
 * duplicar o que já estava no quadro). Sem card e com anúncio ativo, cria.
 * Anúncio pausado sem card fica de fora: o histórico não é importado.
 */
export function planejar(anuncios: AnuncioDaMeta[], campanhas: CampanhaDoQuadro[], cards: CardDoQuadro[]): Plano {
	const plano: Plano = { campanhas: [], criar: [], atualizar: [] }
	const campanhaPorMeta = new Map(campanhas.filter(c => c.meta_campaign_id).map(c => [c.meta_campaign_id as string, c.id]))
	const usados = new Set<string>()

	const grupos = new Map<string, AnuncioDaMeta[]>()
	for (const a of anuncios) {
		const k = `${a.campanhaId}\n${chaveDoNome(carroDoAnuncio(a.nome))}`
		grupos.set(k, [...(grupos.get(k) ?? []), a])
	}

	for (const grupo of grupos.values()) {
		const ids = grupo.map(a => a.id)
		const noAr = grupo.some(a => a.noAr)
		const gasto = grupo.every(a => a.gasto30d === null) ? null : grupo.reduce((s, a) => s + (a.gasto30d ?? 0), 0)
		const carro = carroDoAnuncio(grupo[0].nome)
		const chave = chaveDoNome(carro)
		const campanhaId = campanhaPorMeta.get(grupo[0].campanhaId)
		const livre = (c: CardDoQuadro) => !usados.has(c.id)

		const card =
			cards.find(c => livre(c) && c.meta_ad_ids.some(id => ids.includes(id))) ??
			(campanhaId ? cards.find(c => livre(c) && c.campaign_id === campanhaId && chaveDoNome(c.vehicle_name) === chave) : undefined) ??
			(noAr ? cards.find(c => livre(c) && c.meta_ad_ids.length === 0 && c.status === 'publicada' && chaveDoNome(c.vehicle_name) === chave) : undefined)

		if (card) {
			usados.add(card.id)
			plano.atualizar.push({ id: card.id, adIds: [...new Set([...card.meta_ad_ids, ...ids])], noAr, gasto })
			continue
		}
		// Anúncio renomeado: os ids já estão num card que outro grupo usou nesta
		// rodada. Soma nele em vez de criar um segundo card com os mesmos anúncios.
		const dono = cards.find(c => c.meta_ad_ids.some(id => ids.includes(id)))
		const jaNoPlano = dono && plano.atualizar.find(a => a.id === dono.id)
		if (jaNoPlano) {
			jaNoPlano.noAr = jaNoPlano.noAr || noAr
			jaNoPlano.gasto = jaNoPlano.gasto === null && gasto === null ? null : (jaNoPlano.gasto ?? 0) + (gasto ?? 0)
			continue
		}
		if (!noAr) continue
		if (!campanhaId && !plano.campanhas.some(c => c.metaId === grupo[0].campanhaId)) {
			plano.campanhas.push({ metaId: grupo[0].campanhaId, nome: grupo[0].campanhaNome })
		}
		const criados = grupo.map(a => a.criadoEm).filter((d): d is string => !!d).sort()
		plano.criar.push({
			metaCampanhaId: grupo[0].campanhaId,
			nome: carro,
			// O nome original do anúncio fica na nota quando foi encurtado.
			notas: grupo[0].nome.trim() !== carro ? `Anúncio na Meta: ${grupo[0].nome.trim()}` : null,
			adIds: ids,
			desde: criados[0]?.slice(0, 10) ?? null,
			noAr,
			gasto,
		})
	}

	// Card ligado cujo anúncio sumiu da lista (arquivado ou apagado): fora do ar.
	for (const c of cards) {
		if (c.meta_ad_ids.length > 0 && !usados.has(c.id)) {
			plano.atualizar.push({ id: c.id, adIds: c.meta_ad_ids, noAr: false, gasto: null })
		}
	}
	return plano
}

export interface ResultadoDaSincronia {
	criados: number
	atualizados: number
	campanhasNovas: number
}

/**
 * Conta as mudanças feitas pelo painel (pausar, reativar). Uma sincronia que
 * leu a Meta ANTES de uma dessas mudanças tem o estado velho na mão: se
 * gravasse, diria "no ar" para o anúncio recém-pausado e apagaria a marca de
 * troca de criativo. Ela compara o contador antes de gravar e desiste.
 */
let mudancasDoPainel = 0
export function descartarSincroniaEmCurso(): void {
	mudancasDoPainel += 1
}

async function sincronizar(): Promise<ResultadoDaSincronia> {
	const aoComecar = mudancasDoPainel
	const [anuncios, campanhas, cards] = await Promise.all([
		anunciosDaMeta(),
		db.selectFrom('marketing_campaigns').select(['id', 'meta_campaign_id']).execute(),
		db.selectFrom('campaign_vehicles').select(['id', 'campaign_id', 'vehicle_name', 'status', 'meta_ad_ids']).execute(),
	])
	const plano = planejar(anuncios, campanhas, cards)
	if (mudancasDoPainel !== aoComecar) return { criados: 0, atualizados: 0, campanhasNovas: 0 }

	await db.transaction().execute(async trx => {
		const campanhaPorMeta = new Map(campanhas.filter(c => c.meta_campaign_id).map(c => [c.meta_campaign_id as string, c.id]))
		for (const c of plano.campanhas) {
			const nova = await trx
				.insertInto('marketing_campaigns')
				.values({ name: c.nome, description: 'Trazida da Meta Ads', status: 'publicada', meta_campaign_id: c.metaId })
				.returning('id')
				.executeTakeFirstOrThrow()
			campanhaPorMeta.set(c.metaId, nova.id)
		}
		for (const [i, c] of plano.criar.entries()) {
			const campanhaId = campanhaPorMeta.get(c.metaCampanhaId)
			if (!campanhaId) continue
			await trx
				.insertInto('campaign_vehicles')
				.values({
					campaign_id: campanhaId,
					vehicle_name: c.nome,
					added_date: c.desde,
					notes: c.notas,
					// Depois dos cards que já estavam na campanha.
					display_order: 1000 + i,
					status: 'publicada',
					meta_ad_ids: c.adIds,
					meta_no_ar: c.noAr,
					meta_gasto_30d: c.gasto,
				})
				.execute()
		}
		for (const a of plano.atualizar) {
			await trx
				.updateTable('campaign_vehicles')
				.set({
					meta_ad_ids: a.adIds,
					meta_no_ar: a.noAr,
					// Sem leitura de gasto desta vez, fica o último valor conhecido.
					...(a.gasto === null ? {} : { meta_gasto_30d: a.gasto }),
				})
				.where('id', '=', a.id)
				.execute()
		}
	})

	// O anúncio novo do carro que estava em troca de criativo entrou no ar: a
	// marca de troca sai sozinha.
	await db.updateTable('campaign_vehicles').set({ end_reason: null })
		.where('end_reason', '=', 'troca_criativo').where('meta_no_ar', '=', true).execute()

	return { criados: plano.criar.length, atualizados: plano.atualizar.length, campanhasNovas: plano.campanhas.length }
}

/* ------------------------------------------------------- quando sincronizar */

const INTERVALO_MS = 15 * 60 * 1000
const ESPERA_MAXIMA_MS = 8_000

export interface EstadoDaMeta {
	ligada: boolean
	/** Última sincronia que deu certo (ISO), ou null. */
	em: string | null
	erro: string | null
}

let ultima: { tentativa: number; ok: number | null; erro: string | null } = { tentativa: 0, ok: null, erro: null }
let emCurso: Promise<void> | null = null

export function estadoDaMeta(): EstadoDaMeta {
	return {
		ligada: metaConfigurada(),
		em: ultima.ok ? new Date(ultima.ok).toISOString() : null,
		erro: ultima.erro,
	}
}

/**
 * Sincroniza se a última tentativa tem mais de 15 minutos (ou se `forcar`).
 * Espera no máximo 8 s: a Meta lenta não segura a tela, e a sincronia termina
 * sozinha para a próxima abertura. Nunca levanta.
 */
export async function sincronizarCampanhasDaMeta({ forcar = false } = {}): Promise<EstadoDaMeta> {
	if (!metaConfigurada()) return estadoDaMeta()
	if (!emCurso && (forcar || Date.now() - ultima.tentativa > INTERVALO_MS)) {
		ultima = { ...ultima, tentativa: Date.now() }
		emCurso = sincronizar()
			.then(() => {
				ultima = { ...ultima, ok: Date.now(), erro: null }
			})
			.catch(e => {
				console.warn('[meta] sincronia das campanhas falhou:', e)
				ultima = { ...ultima, erro: e instanceof Error ? e.message : 'Falha ao ler a Meta' }
			})
			.finally(() => {
				emCurso = null
			})
	}
	if (emCurso) {
		await Promise.race([emCurso, new Promise(ok => setTimeout(ok, forcar ? 30_000 : ESPERA_MAXIMA_MS))])
	}
	return estadoDaMeta()
}

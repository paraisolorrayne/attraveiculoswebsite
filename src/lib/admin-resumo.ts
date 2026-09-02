/**
 * Os números da tela inicial do admin.
 *
 * A tela era um menu de nove cards iguais: abria, não dizia nada, e quem
 * entrava tinha que visitar módulo por módulo para saber se havia algo novo.
 * Aqui ela ganha o mínimo para responder "aconteceu alguma coisa?" antes do
 * primeiro clique.
 *
 * JANELA DE 24 HORAS nos números de fluxo (decisão da Lorrayne, 02/09/2026).
 * Sete dias enche a tela de número grande que não muda de manhã para a tarde;
 * 24h é o que de fato responde "e desde ontem?".
 *
 * O QUE É FLUXO E O QUE É ESTADO. Nem tudo tem movimento diário: "rascunhos no
 * blog" ou "áudios cadastrados" em 24h seria zero quase sempre, e uma tela
 * inteira de zeros parece quebrada, não calma. Então o fluxo (sessões,
 * WhatsApp, leads, peças, inscritos) vem das últimas 24h e o estado (tarefas em
 * aberto, rascunhos, áudios, contas ativas) vem do total — e cada número leva o
 * rótulo que diz qual dos dois é.
 *
 * FALHA APARECE, não vira zero. Cada consulta é independente e a que falhar
 * devolve `null`, que a tela mostra como "—". Zero e "não consegui contar" são
 * respostas diferentes, e trocar uma pela outra é exatamente como duas tabelas
 * ficaram seis meses sem existir em produção sem ninguém notar (ver o comentário
 * de TABELAS_DO_CODIGO em src/lib/db/types.ts).
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'

/** Um número pronto para a tela. `valor: null` = a consulta falhou. */
export interface Indicador {
	valor: number | null
	rotulo: string
}

export interface ResumoAdmin {
	/** Pulso das últimas 24h, na faixa do topo. */
	pulso: {
		sessoes: Indicador
		whatsapp: Indicador
		leads: Indicador
	}
	/** Um por seção, indexado pelo href — a tela não precisa saber a ordem. */
	porSecao: Record<string, Indicador>
}

const VAZIO: Indicador = { valor: null, rotulo: '' }

function desde24h(): Date {
	return new Date(Date.now() - 24 * 60 * 60 * 1000)
}

/** Roda uma contagem; qualquer erro vira `null` em vez de derrubar a página. */
async function contar(rotulo: string, consulta: () => Promise<number>): Promise<Indicador> {
	try {
		return { valor: await consulta(), rotulo }
	} catch (e) {
		console.warn(`[admin/resumo] falhou "${rotulo}":`, e)
		return { valor: null, rotulo }
	}
}

/** `count(*)` como número — o driver devolve bigint como string. */
const total = sql<string>`count(*)`

export async function carregarResumo(): Promise<ResumoAdmin> {
	const desde = desde24h()
	const n = (r: { total: string } | undefined) => Number(r?.total ?? 0)

	const [
		sessoes,
		whatsapp,
		leads,
		tarefas,
		criativos,
		rascunhos,
		inscritos,
		audios,
		contas,
	] = await Promise.all([
		contar('sessões · 24h', async () =>
			n(
				await db
					.selectFrom('visitor_sessions')
					.select(total.as('total'))
					.where('started_at', '>=', desde)
					.executeTakeFirst(),
			),
		),
		contar('cliques no WhatsApp · 24h', async () =>
			n(
				await db
					.selectFrom('whatsapp_clicks')
					.select(total.as('total'))
					// Fragmento parametrizado, como whatsapp-correlacao-db.ts: a coluna
					// é `Generated<Timestamp>` e o operando tipado do Kysely não
					// aceita Date nessa posição.
					.where(sql<boolean>`clicked_at >= ${desde}`)
					.executeTakeFirst(),
			),
		),
		contar('leads novos · 24h', async () =>
			n(
				await db
					.selectFrom('crm_cards')
					.select(total.as('total'))
					.where('criado_em', '>=', desde)
					.executeTakeFirst(),
			),
		),
		contar('tarefas em aberto', async () =>
			n(
				await db
					.selectFrom('marketing_tasks')
					.select(total.as('total'))
					.where('status', '!=', 'completed')
					.executeTakeFirst(),
			),
		),
		contar('peças · 24h', async () =>
			n(
				await db
					.selectFrom('marketing_creatives')
					.select(total.as('total'))
					.where('created_at', '>=', desde)
					.executeTakeFirst(),
			),
		),
		contar('rascunhos', async () =>
			n(
				await db
					.selectFrom('dual_blog_posts')
					.select(total.as('total'))
					.where('is_published', '=', false)
					.executeTakeFirst(),
			),
		),
		contar('inscritos · 24h', async () =>
			n(
				await db
					.selectFrom('newsletter_subscribers')
					.select(total.as('total'))
					.where('subscribed_at', '>=', desde)
					.where('is_active', '=', true)
					.executeTakeFirst(),
			),
		),
		contar('áudios cadastrados', async () =>
			n(await db.selectFrom('vehicle_sounds').select(total.as('total')).executeTakeFirst()),
		),
		contar('contas ativas', async () =>
			n(
				await db
					.selectFrom('admin_users')
					.select(total.as('total'))
					.where('is_active', '=', true)
					.executeTakeFirst(),
			),
		),
	])

	return {
		pulso: { sessoes, whatsapp, leads },
		porSecao: {
			'/admin/marketing': tarefas,
			'/admin/gerador-criativos': criativos,
			'/admin/visitors': sessoes,
			'/admin/crm': leads,
			'/admin/blog': rascunhos,
			'/admin/newsletter/campaigns': inscritos,
			'/admin/engine-sounds': audios,
			'/admin/usuarios': contas,
			// Configurações não tem número: contar chaves de ajuste não diz nada
			// a ninguém, e um número inútil é pior que campo vazio.
			'/admin/settings': VAZIO,
		},
	}
}

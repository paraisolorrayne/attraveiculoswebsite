import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { ligarCardsASessoes } from '@/lib/visitors/ligacao-cards-db'
import {
	chaveCampanha,
	classificarCanal,
	normalizarCampanha,
	corCanal,
	rotuloCanal,
	SEM_CAMPANHA,
	type CanalTrafego,
} from '@/lib/traffic-channel'
import {
	CAMPOS_REF_SESSAO,
	JANELA_ATRIBUICAO_DIAS,
	novoAgregado,
	origemCrmInfo,
	somarCard,
	ORIGEM_CRM_AUSENTE,
	type AgregadoReceita,
} from '@/lib/atribuicao-receita'

// Fechamento do ciclo: tráfego do site → card do CRM → R$ de venda fechada.
//
// A pergunta é "qual canal gera venda, não clique". Responder isso exige ligar uma linha de
// `crm_cards` a uma linha de `visitor_sessions`, e HOJE NÃO EXISTE CHAVE FORTE para isso: o site
// manda o id da sessão para o CRM (`lead_id` no lead de formulário e `[ref: ...]` na mensagem do
// WhatsApp), mas o webhook de volta nunca traz nenhum dos dois.
//
// Esta rota, então, faz duas coisas ao mesmo tempo e nunca confunde uma com a outra:
//   1. PROCURA a chave forte nos extras (`dados`) de cada card e mede quanto ela cobre. Se o
//      emissor um dia devolver o campo, a cobertura sobe sozinha, sem mudar código.
//   2. Na falta dela, liga por TELEFONE NORMALIZADO (card ↔ `visitor_profiles`) e escolhe a
//      última sessão da pessoa dentro da janela de atribuição.
// Todo número de receita sai acompanhado do denominador que o sustenta — quantos cards e quanto
// de R$ ficaram DE FORA da ligação. Sem isso a tabela por canal viraria ficção convincente.

const DIAS_PADRAO = 30
const DIAS_MAX = 730
const LIMITE_CARDS = 5000
const LIMITE_CAMPANHAS = 15

interface LinhaAgregada extends AgregadoReceita {
	chave: string
}

function agregarEm(mapa: Map<string, AgregadoReceita>, chave: string, card: { etapa: string; valor: number | null }) {
	const alvo = mapa.get(chave) ?? novoAgregado()
	somarCard(alvo, card)
	mapa.set(chave, alvo)
}

function ordenarPorReceita(mapa: Map<string, AgregadoReceita>): LinhaAgregada[] {
	return [...mapa.entries()]
		.map(([chave, a]) => ({ chave, ...a }))
		.sort((a, b) => b.receita - a.receita || b.ganhos - a.ganhos || b.cards - a.cards)
}

/** Chave do item mais frequente — a grafia/canal que responde por mais cards da campanha. */
function maisFrequente(contagem: Map<string, number> | undefined, padrao: string): string {
	let melhor = padrao
	let maior = -1
	for (const [chave, n] of contagem ?? []) {
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

		// Período pela CRIAÇÃO do card (entrada do lead), não pelo fechamento. É a leitura de
		// coorte: compara a mídia do período com o que ela devolveu, mesmo que a venda tenha sido
		// assinada depois. Usar `encerrado_em` misturaria lead velho com mídia nova.
		let consultaCards = db
			.selectFrom('crm_cards')
			.select(['id', 'etapa', 'origem', 'telefone', 'criado_em', 'dados'])
			.select(sql<number>`coalesce(valor, 0)::float8`.as('valor'))
			.orderBy('criado_em', 'desc')
			.limit(LIMITE_CARDS)
		if (desde) consultaCards = consultaCards.where('criado_em', '>=', desde)

		const cards = await consultaCards.execute()

		// Passadas 1 a 3 (identificador de sessão no card, telefone ↔ perfil) moram em
		// ligacao-cards-db.ts desde 02/10/2026, para a área da agência usar a mesma regra.
		const ligacao = await ligarCardsASessoes(cards)
		const { candidatosPorCampo } = ligacao

		// ---- Passada 4: atribuição card a card ----
		const porCanal = new Map<string, AgregadoReceita>()
		// Chaveado por `chaveCampanha` (caixa unificada), a MESMA chave que a rota de métricas
		// usa: sem isso "Black Friday" e "black friday" viram uma linha na tabela de campanhas e
		// duas na de receita, na mesma tela. `rotulosCampanha` guarda as grafias originais para
		// exibir a mais usada — a chave em minúsculas nunca aparece para a leitora.
		const porCampanha = new Map<string, AgregadoReceita>()
		const rotulosCampanha = new Map<string, Map<string, number>>()
		const canalDaCampanha = new Map<string, Map<CanalTrafego, number>>()
		const porOrigemCrm = new Map<string, AgregadoReceita>()
		const totalGeral = novoAgregado()
		const totalLigado = novoAgregado()

		// Os cinco contadores do bloco do meio formam uma PARTIÇÃO dos cards do período: cada card
		// incrementa exatamente um deles e a soma fecha com `cards`. É o que deixa a tela dizer
		// "ligados + não ligados = todos os leads" sem o mesmo card aparecer dos dois lados. Os dois
		// primeiros são informativos e se sobrepõem à partição de propósito — não entram na soma.
		const cobertura = {
			cards: cards.length,
			/** Informativo: quantos cards trazem telefone comparável, ligados ou não. */
			cards_com_telefone: 0,
			/** Informativo: quantos trazem um campo candidato a identificador. Trazer não é casar. */
			cards_com_candidato_de_sessao: ligacao.cardsComCandidato,
			cards_por_chave_forte: 0,
			cards_por_telefone: 0,
			/** Sem ligação e sem telefone comparável no card: não havia por onde tentar. */
			cards_sem_ligacao_sem_telefone: 0,
			/** Telefone válido que não existe em nenhum perfil identificado do site. */
			cards_telefone_sem_perfil: 0,
			/** Telefone bateu com um perfil, mas nenhuma sessão dele cai na janela de atribuição. */
			cards_telefone_sem_sessao: 0,
			perfis_com_telefone: ligacao.perfisComTelefone,
			perfis_truncados: ligacao.perfisTruncados,
			cards_truncados: cards.length >= LIMITE_CARDS,
			janela_dias: JANELA_ATRIBUICAO_DIAS,
		}

		for (const card of cards) {
			const dadosCard = { etapa: card.etapa, valor: card.valor }
			somarCard(totalGeral, dadosCard)

			const origem = card.origem?.trim() || ORIGEM_CRM_AUSENTE
			agregarEm(porOrigemCrm, origem, dadosCard)

			if (ligacao.cardsComTelefone.has(card.id)) cobertura.cards_com_telefone += 1

			const { sessao, metodo, motivo } = ligacao.ligacoes.get(card.id)!

			// Um `if` por card, um contador por card: é assim que a partição se mantém fechada.
			if (metodo === 'chave_forte') cobertura.cards_por_chave_forte += 1
			else if (metodo === 'telefone') cobertura.cards_por_telefone += 1
			else if (motivo === 'sem_telefone') cobertura.cards_sem_ligacao_sem_telefone += 1
			else if (motivo === 'telefone_sem_perfil') cobertura.cards_telefone_sem_perfil += 1
			else cobertura.cards_telefone_sem_sessao += 1

			if (!sessao) continue

			somarCard(totalLigado, dadosCard)

			const canal = classificarCanal(sessao)
			agregarEm(porCanal, canal, dadosCard)

			const chaveCamp = chaveCampanha(sessao.utm_campaign)
			if (chaveCamp !== SEM_CAMPANHA) {
				agregarEm(porCampanha, chaveCamp, dadosCard)
				const rotulo = normalizarCampanha(sessao.utm_campaign)
				const grafias = rotulosCampanha.get(chaveCamp) ?? new Map<string, number>()
				grafias.set(rotulo, (grafias.get(rotulo) ?? 0) + 1)
				rotulosCampanha.set(chaveCamp, grafias)
				const contagem = canalDaCampanha.get(chaveCamp) ?? new Map<CanalTrafego, number>()
				contagem.set(canal, (contagem.get(canal) ?? 0) + 1)
				canalDaCampanha.set(chaveCamp, contagem)
			}
		}

		const canais = ordenarPorReceita(porCanal).map(linha => {
			const canal = linha.chave as CanalTrafego
			return {
				canal,
				rotulo: rotuloCanal(canal),
				cor: corCanal(canal),
				cards: linha.cards,
				ganhos: linha.ganhos,
				perdidos: linha.perdidos,
				abertos: linha.abertos,
				receita: linha.receita,
				ganhos_sem_valor: linha.ganhos_sem_valor,
			}
		})

		const campanhas = ordenarPorReceita(porCampanha).map(linha => {
			const canal = maisFrequente(canalDaCampanha.get(linha.chave), 'outro') as CanalTrafego
			return {
				// Exibe a grafia original mais usada, não a chave em minúsculas.
				campanha: maisFrequente(rotulosCampanha.get(linha.chave), linha.chave),
				canal,
				rotulo_canal: rotuloCanal(canal),
				cor_canal: corCanal(canal),
				cards: linha.cards,
				ganhos: linha.ganhos,
				receita: linha.receita,
				ganhos_sem_valor: linha.ganhos_sem_valor,
			}
		})

		const origens = ordenarPorReceita(porOrigemCrm).map(linha => {
			const info = origemCrmInfo(linha.chave)
			return {
				origem: linha.chave,
				rotulo: info.rotulo,
				leitura: info.leitura,
				cards: linha.cards,
				ganhos: linha.ganhos,
				perdidos: linha.perdidos,
				receita: linha.receita,
				ganhos_sem_valor: linha.ganhos_sem_valor,
			}
		})

		// Diagnóstico da chave forte: quantos cards trazem cada campo candidato e quantos desses
		// realmente casaram com uma sessão. Trazer o campo e não casar significa que o valor é de
		// outro sistema (o id interno do CRM, por exemplo) — não que a ligação funcionou.
		const camposCandidatos = [...candidatosPorCampo.entries()]
			.map(([campo, cards_com_o_campo]) => ({ campo, cards_com_o_campo }))
			.sort((a, b) => b.cards_com_o_campo - a.cards_com_o_campo)

		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			base: 'criado_em',
			cobertura,
			campos_procurados: CAMPOS_REF_SESSAO,
			campos_candidatos: camposCandidatos,
			total: {
				cards: totalGeral.cards,
				ganhos: totalGeral.ganhos,
				perdidos: totalGeral.perdidos,
				abertos: totalGeral.abertos,
				receita: totalGeral.receita,
				ganhos_sem_valor: totalGeral.ganhos_sem_valor,
			},
			ligado: {
				cards: totalLigado.cards,
				ganhos: totalLigado.ganhos,
				receita: totalLigado.receita,
				ganhos_sem_valor: totalLigado.ganhos_sem_valor,
			},
			canais,
			campanhas: campanhas.slice(0, LIMITE_CAMPANHAS),
			campanhas_total: campanhas.length,
			origens_crm: origens,
		})
	} catch (error) {
		console.error('[Atribuição Receita API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

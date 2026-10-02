/**
 * Liga cada card do CRM a uma sessão do site — a mesma regra da receita do
 * painel da Attra (rota atribuicao-receita), extraída para a área da agência
 * usar sem divergir: 1) identificador de sessão que o card carrega em `dados`
 * (chave forte); 2) na falta dele, telefone do card ↔ perfil identificado no
 * site, escolhendo a última sessão da pessoa na janela de atribuição.
 *
 * Os comentários das passadas vieram junto, sem mudança.
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { SessaoAtribuicao } from '@/lib/traffic-channel'
import {
	chaveTelefone,
	extrairRefSessao,
	ligarCardASessao,
	pareceUuid,
	perfisParaFallbackPorTelefone,
	type ResultadoLigacao,
} from '@/lib/atribuicao-receita'

// Perfis identificados são poucos (quem deixou e-mail/telefone). O teto existe só para que um
// crescimento inesperado não vire uma leitura de tabela inteira em memória sem ninguém notar.
export const LIMITE_PERFIS = 20000

export interface SessaoOrigem extends SessaoAtribuicao {
	id: string
	session_id: string
	started_at: Date
}

export interface CardParaLigar {
	id: string
	telefone: string | null
	criado_em: Date
	dados: Parameters<typeof extrairRefSessao>[0]
}

export async function ligarCardsASessoes(cards: CardParaLigar[]) {
	const perfis = await db
		.selectFrom('visitor_profiles')
		.select(['id', 'phone'])
		.where('phone', 'is not', null)
		.limit(LIMITE_PERFIS)
		.execute()

	// ---- Passada 1: o que cada card carrega de identificador ----
	const refsPorCard = new Map<string, { valor: string; campo: string }>()
	// Quantos cards TRAZEM cada campo candidato (não é o mesmo que quantos casaram).
	const candidatosPorCampo = new Map<string, number>()
	const chavesTelefone = new Map<string, string>()

	for (const card of cards) {
		const ref = extrairRefSessao(card.dados)
		if (ref) {
			refsPorCard.set(card.id, ref)
			candidatosPorCampo.set(ref.campo, (candidatosPorCampo.get(ref.campo) ?? 0) + 1)
		}
		const tel = chaveTelefone(card.telefone)
		if (tel) chavesTelefone.set(card.id, tel)
	}

	// ---- Passada 2: resolver os identificadores contra as sessões reais ----
	const valoresRef = [...new Set([...refsPorCard.values()].map(r => r.valor))]
	const refsUuid = valoresRef.filter(pareceUuid)
	const refsTexto = valoresRef.filter(v => !pareceUuid(v))

	const COLUNAS_SESSAO = [
		'id',
		'session_id',
		'started_at',
		'utm_source',
		'utm_medium',
		'utm_campaign',
		'gclid',
		'fbclid',
		'ttclid',
		'referrer_domain',
	] as const

	const sessoesPorRef = new Map<string, SessaoOrigem>()
	if (valoresRef.length > 0) {
		// `visitor_sessions.id` é UUID e `session_id` é a string do browser: comparar cada valor
		// só na coluna do formato certo evita erro de cast no Postgres.
		const encontradas = await db
			.selectFrom('visitor_sessions')
			.select(COLUNAS_SESSAO)
			.where(eb =>
				eb.or([
					...(refsTexto.length ? [eb('session_id', 'in', refsTexto)] : []),
					...(refsUuid.length ? [eb('id', 'in', refsUuid)] : []),
				]),
			)
			.execute()

		for (const s of encontradas) {
			sessoesPorRef.set(s.id, s)
			sessoesPorRef.set(s.session_id, s)
		}
	}

	// Daqui para frente o que vale não é "o card TRAZIA um candidato", e sim "o candidato virou
	// sessão". `lead_id` com o id interno do CRM é o caso esperado (campo desconhecido cai no
	// JSONB `dados`, ver src/lib/crm-webhook.ts) e não é ligação nenhuma.
	const sessaoForteDoCard = new Map<string, SessaoOrigem>()
	for (const [cardId, ref] of refsPorCard) {
		const sessao = sessoesPorRef.get(ref.valor)
		if (sessao) sessaoForteDoCard.set(cardId, sessao)
	}

	// ---- Passada 3: telefone do card ↔ perfil identificado no site ----
	const perfisPorTelefone = new Map<string, string[]>()
	for (const perfil of perfis) {
		const chave = chaveTelefone(perfil.phone)
		if (!chave) continue
		const lista = perfisPorTelefone.get(chave) ?? []
		lista.push(perfil.id)
		perfisPorTelefone.set(chave, lista)
	}

	// Só a chave forte que REALMENTE resolveu numa sessão dispensa o telefone: testar apenas se o
	// card tem candidato descartaria o perfil de todo card cujo identificador é de outro
	// sistema, e aí a ligação por telefone nunca chegaria a ser consultada.
	const perfisAlvo = perfisParaFallbackPorTelefone({
		chavesTelefonePorCard: chavesTelefone,
		cardsComChaveForteResolvida: sessaoForteDoCard,
		perfisPorTelefone,
	})

	const sessoesPorPerfil = new Map<string, SessaoOrigem[]>()
	if (perfisAlvo.size > 0) {
		// Um perfil pode ter vários fingerprints (celular + desktop, ou o mesmo browser antes e
		// depois de limpar cookie). `resolved_profile_id` guarda a resolução atual do
		// fingerprint; `identity_events` guarda o histórico. A união dos dois é o conjunto real
		// de dispositivos daquela pessoa.
		// SÓ dispositivos com identificador confiável (aleatório). O esquema
		// antigo derivava o id das características do aparelho, sem nada de
		// aleatório: aparelhos iguais viravam a MESMA linha, e um único
		// "dispositivo" acumulou 1.705 sessões de pessoas diferentes. Usar isso
		// aqui não deixaria a atribuição imprecisa — deixaria ERRADA, creditando
		// a venda à campanha que trouxe um estranho.
		const ids = [...perfisAlvo]
		const resultado = await sql<SessaoOrigem & { profile_id: string }>`
			with fps as (
				select f.id as fingerprint_id, f.resolved_profile_id as profile_id
				from visitor_fingerprints f
				where f.resolved_profile_id::text = any(${ids})
				  and f.origem_id = 'aleatorio'
				union
				select ie.fingerprint_id, ie.profile_id
				from identity_events ie
				join visitor_fingerprints f2 on f2.id = ie.fingerprint_id
				where ie.profile_id::text = any(${ids})
				  and ie.fingerprint_id is not null
				  and f2.origem_id = 'aleatorio'
			)
			select
				fps.profile_id::text as profile_id,
				s.id::text as id,
				s.session_id,
				s.started_at,
				s.utm_source,
				s.utm_medium,
				s.utm_campaign,
				s.gclid,
				s.fbclid,
				s.ttclid,
				s.referrer_domain
			from visitor_sessions s
			join fps on fps.fingerprint_id = s.fingerprint_id
		`.execute(db)

		for (const linha of resultado.rows) {
			const lista = sessoesPorPerfil.get(linha.profile_id) ?? []
			lista.push(linha)
			sessoesPorPerfil.set(linha.profile_id, lista)
		}
	}

	const ligacoes = new Map<string, ResultadoLigacao<SessaoOrigem>>()
	for (const card of cards) {
		const chaveTel = chavesTelefone.get(card.id)
		const perfisDoCard = chaveTel ? perfisPorTelefone.get(chaveTel) : undefined
		ligacoes.set(
			card.id,
			ligarCardASessao<SessaoOrigem>({
				sessaoChaveForte: sessaoForteDoCard.get(card.id) ?? null,
				temTelefone: Boolean(chaveTel),
				telefoneTemPerfil: Boolean(perfisDoCard?.length),
				sessoesDoTelefone: perfisDoCard?.flatMap(id => sessoesPorPerfil.get(id) ?? []) ?? [],
				criadoEm: card.criado_em,
			}),
		)
	}

	return {
		ligacoes,
		/** Cards com telefone comparável (ligados ou não). */
		cardsComTelefone: new Set(chavesTelefone.keys()),
		/** Quantos cards TRAZEM cada campo candidato a identificador (trazer não é casar). */
		candidatosPorCampo,
		cardsComCandidato: refsPorCard.size,
		perfisComTelefone: perfis.length,
		perfisTruncados: perfis.length >= LIMITE_PERFIS,
	}
}

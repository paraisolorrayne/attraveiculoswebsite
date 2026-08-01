import { NextResponse } from 'next/server'
import { sql } from 'kysely'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { db } from '@/lib/db'
import {
  extrairRefSessao,
  pareceUuid,
  chaveTelefone,
  escolherSessaoDoCard,
} from '@/lib/atribuicao-receita'
import { classificarCanal, normalizarCampanha, rotuloCanal } from '@/lib/traffic-channel'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

interface SessaoOrigem {
  id: string
  session_id: string | null
  started_at: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  gclid: string | null
  fbclid: string | null
  ttclid: string | null
  referrer_domain: string | null
}

/** Como a visita foi ligada ao lead — a UI mostra isso junto do resultado. */
type MetodoOrigem = 'certa' | 'provavel'

interface OrigemDoCard {
  campanha: string
  canal: string
  metodo: MetodoOrigem
}

/**
 * Origem (campanha + canal) de cada lead.
 *
 * Dois caminhos, em ordem de confiança:
 *   1. CERTA — o CRM devolveu o identificador da visita (marcador `[ref: ...]`
 *      da conversa de WhatsApp ou campo próprio). Liga a visita exata.
 *   2. PROVÁVEL — casamento por telefone entre o card e um visitante
 *      identificado no site, escolhendo a visita mais próxima do card.
 *
 * O caminho por telefone só usa dispositivos com identificador ALEATÓRIO. O
 * esquema antigo derivava o id do aparelho e colidia em massa (um "dispositivo"
 * com 1.705 sessões de pessoas diferentes); atribuir por ali não seria
 * impreciso, seria errado.
 */
async function origensDosCards(
  cards: { id: string; telefone: string | null; criado_em: Date | string | null; atualizado_em: Date | string; dados: unknown }[],
): Promise<Map<string, OrigemDoCard>> {
  const saida = new Map<string, OrigemDoCard>()
  if (cards.length === 0) return saida

  // ---- 1. Identificador devolvido pelo CRM ----
  const refPorCard = new Map<string, string>()
  for (const card of cards) {
    const ref = extrairRefSessao(card.dados as Record<string, unknown> | null)
    if (ref) refPorCard.set(card.id, ref.valor)
  }

  const sessoesPorRef = new Map<string, SessaoOrigem>()
  const refs = [...new Set(refPorCard.values())]
  if (refs.length > 0) {
    const uuids = refs.filter(pareceUuid)
    const tokens = refs.filter(r => !pareceUuid(r))
    const linhas = await sql<SessaoOrigem & { chave: string }>`
      select
        s.id::text as id, s.session_id, s.started_at, s.utm_source, s.utm_medium,
        s.utm_campaign, s.gclid, s.fbclid, s.ttclid, s.referrer_domain,
        case when s.id::text = any(${uuids}) then s.id::text else s.session_id end as chave
      from visitor_sessions s
      where s.id::text = any(${uuids}) or s.session_id = any(${tokens})
    `.execute(db)
    for (const linha of linhas.rows) {
      if (linha.chave) sessoesPorRef.set(linha.chave, linha)
    }
  }

  // ---- 2. Telefone → visitante identificado → visitas (só id confiável) ----
  const telefonePorCard = new Map<string, string>()
  for (const card of cards) {
    if (sessoesPorRef.has(refPorCard.get(card.id) ?? '')) continue
    const tel = chaveTelefone(card.telefone)
    if (tel) telefonePorCard.set(card.id, tel)
  }

  const sessoesPorTelefone = new Map<string, SessaoOrigem[]>()
  if (telefonePorCard.size > 0) {
    // A normalização de telefone mora em `chaveTelefone` e é aplicada aqui, em
    // JS, dos dois lados. Reescrevê-la em SQL criaria duas regras que precisam
    // concordar para sempre — e telefone é justamente onde elas divergiriam
    // (prefixo 55, nono dígito, DDD que parece código de país).
    const perfis = await db.selectFrom('visitor_profiles')
      .select(['id', 'phone'])
      .where('phone', 'is not', null)
      .execute()

    const perfisPorChave = new Map<string, string[]>()
    for (const perfil of perfis) {
      const chave = chaveTelefone(perfil.phone)
      if (!chave) continue
      const lista = perfisPorChave.get(chave) ?? []
      lista.push(perfil.id)
      perfisPorChave.set(chave, lista)
    }

    const perfisAlvo = [...new Set(
      [...telefonePorCard.values()].flatMap(chave => perfisPorChave.get(chave) ?? []),
    )]

    if (perfisAlvo.length > 0) {
      const linhas = await sql<SessaoOrigem & { profile_id: string }>`
        with fps as (
          select f.id as fingerprint_id, f.resolved_profile_id as profile_id
          from visitor_fingerprints f
          where f.resolved_profile_id::text = any(${perfisAlvo})
            and f.origem_id = 'aleatorio'
          union
          select ie.fingerprint_id, ie.profile_id
          from identity_events ie
          join visitor_fingerprints f2 on f2.id = ie.fingerprint_id
          where ie.profile_id::text = any(${perfisAlvo})
            and ie.fingerprint_id is not null
            and f2.origem_id = 'aleatorio'
        )
        select
          fps.profile_id::text as profile_id,
          s.id::text as id, s.session_id, s.started_at, s.utm_source, s.utm_medium,
          s.utm_campaign, s.gclid, s.fbclid, s.ttclid, s.referrer_domain
        from visitor_sessions s
        join fps on fps.fingerprint_id = s.fingerprint_id
      `.execute(db)

      const sessoesPorPerfil = new Map<string, SessaoOrigem[]>()
      for (const linha of linhas.rows) {
        const lista = sessoesPorPerfil.get(linha.profile_id) ?? []
        lista.push(linha)
        sessoesPorPerfil.set(linha.profile_id, lista)
      }
      for (const [chave, ids] of perfisPorChave) {
        const sessoes = ids.flatMap(id => sessoesPorPerfil.get(id) ?? [])
        if (sessoes.length > 0) sessoesPorTelefone.set(chave, sessoes)
      }
    }
  }

  // ---- 3. Resolve card a card ----
  for (const card of cards) {
    const ref = refPorCard.get(card.id)
    const forte = ref ? sessoesPorRef.get(ref) : undefined
    const quando = card.criado_em ?? card.atualizado_em

    let sessao: SessaoOrigem | null = forte ?? null
    let metodo: MetodoOrigem = 'certa'

    if (!sessao) {
      const tel = telefonePorCard.get(card.id)
      const candidatas = tel ? (sessoesPorTelefone.get(tel) ?? []) : []
      sessao = escolherSessaoDoCard(candidatas, quando)
      metodo = 'provavel'
    }
    if (!sessao) continue

    saida.set(card.id, {
      campanha: normalizarCampanha(sessao.utm_campaign),
      canal: rotuloCanal(classificarCanal(sessao)),
      metodo,
    })
  }

  return saida
}

// Visão CRM (somente leitura). Acesso: admin e owner.
export async function GET() {
  const admin = await getCurrentAdmin()
  if (!admin || !['admin', 'owner'].includes(admin.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // IMPORTANTE: inclui o JSONB `dados` (o modal de detalhes depende dele).
  try {
    const data = await db.selectFrom('crm_cards').selectAll()
      .orderBy('atualizado_em', 'desc')
      .limit(500)
      .execute()

    // A origem é um enriquecimento: se falhar, os cards ainda precisam abrir.
    let origens = new Map<string, OrigemDoCard>()
    try {
      origens = await origensDosCards(data)
    } catch (error) {
      console.error('[CRM] Falha ao resolver origem dos leads:', error)
    }

    const cards = data.map(card => ({ ...card, origem_campanha: origens.get(card.id) ?? null }))
    return NextResponse.json({ cards })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'query failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { anunciosAtivos, metaConfigurada, mudarStatusDosAnuncios } from '@/lib/meta-ads'

export const dynamic = 'force-dynamic'

/** Motivos de encerramento, os mesmos do cadastro da campanha. */
const MOTIVOS = ['ganho', 'vendido_externo', 'performance', 'despriorizado', 'troca_criativo'] as const
type Motivo = (typeof MOTIVOS)[number]

/**
 * POST — pausa ou reativa na Meta os anúncios de UM card.
 *
 *   { acao: 'pausar', motivo?: 'ganho' | 'vendido_externo' | 'performance' | 'despriorizado' | 'troca_criativo' }
 *   { acao: 'reativar' }
 *
 * Os ids dos anúncios saem do banco, pelo id do card. Com motivo, o card
 * também é encerrado no painel; sem motivo, fica só "Pausado na Meta".
 * "Troca de criativo" é a exceção: o carro segue anunciado, então o card fica
 * aberto e marcado, esperando o anúncio novo.
 * Todo pedido é gravado em `meta_acoes`, tenha dado certo ou não.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRoute(admin.role, '/admin/marketing', admin.secoes)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (!metaConfigurada()) return NextResponse.json({ error: 'Meta Ads não está ligada a este painel.' }, { status: 503 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Card inválido' }, { status: 400 })
  const body = (await request.json().catch(() => null)) as { acao?: string; motivo?: string } | null
  const acao = body?.acao
  if (acao !== 'pausar' && acao !== 'reativar') return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  const motivo: Motivo | null = acao === 'pausar' && MOTIVOS.includes(body?.motivo as Motivo) ? (body?.motivo as Motivo) : null

  try {
    const card = await db.selectFrom('campaign_vehicles').select(['id', 'vehicle_name', 'meta_ad_ids']).where('id', '=', id).executeTakeFirst()
    if (!card) return NextResponse.json({ error: 'Card não encontrado' }, { status: 404 })
    if (card.meta_ad_ids.length === 0) return NextResponse.json({ error: 'Este card não veio da Meta.' }, { status: 400 })

    // O card pode guardar mais anúncios do que os que devem mudar: depois de
    // uma troca de criativo, o antigo (preço velho) fica junto do novo.
    //   pausar   → só os que estão ativos agora;
    //   reativar → só os que o painel pausou por último neste card.
    // Sem essa regra, "Reativar" religaria o anúncio antigo junto.
    let alvos = card.meta_ad_ids
    if (acao === 'pausar') {
      const ativos = await anunciosAtivos(card.meta_ad_ids)
      if (ativos && ativos.size > 0) alvos = card.meta_ad_ids.filter(a => ativos.has(a))
    } else {
      const ultima = await db.selectFrom('meta_acoes').select(['ad_ids'])
        .where('card_id', '=', card.id).where('acao', '=', 'pausar').where('resultado', '=', 'ok')
        .orderBy('criado_em', 'desc').limit(1).executeTakeFirst()
      const pausados = (ultima?.ad_ids ?? []).filter(a => card.meta_ad_ids.includes(a))
      if (pausados.length > 0) alvos = pausados
    }

    const { ok, falhas } = await mudarStatusDosAnuncios(alvos, acao === 'pausar' ? 'PAUSED' : 'ACTIVE')
    const erro = falhas.length > 0 ? falhas.map(f => `${f.id}: ${f.erro}`).join('; ').slice(0, 900) : null

    await db.insertInto('meta_acoes').values({
      card_id: card.id,
      carro: card.vehicle_name,
      acao,
      motivo,
      ad_ids: alvos,
      por: admin.id,
      por_nome: admin.name || admin.email.split('@')[0],
      resultado: erro ?? 'ok',
    }).execute().catch(e => console.warn('[meta] registro da ação falhou:', e))

    if (erro) {
      // Parte pode ter mudado: o card não é tocado e a próxima leitura da Meta
      // mostra o estado real.
      return NextResponse.json({
        error: ok.length > 0
          ? `Só ${ok.length} de ${alvos.length} anúncios mudaram. A Meta recusou o resto: ${erro}`
          : `A Meta recusou: ${erro}`,
      }, { status: 502 })
    }

    const hoje = new Date().toISOString().slice(0, 10)
    const vehicle = await db.updateTable('campaign_vehicles')
      .set(acao === 'reativar'
        ? { meta_no_ar: true, status: 'publicada', end_reason: null, ended_date: null }
        : motivo === 'troca_criativo'
          ? { meta_no_ar: false, end_reason: motivo }
        : motivo
          ? { meta_no_ar: false, status: motivo === 'ganho' || motivo === 'vendido_externo' ? 'encerrada_ganho' : 'encerrada_desempenho', end_reason: motivo, ended_date: hoje }
          : { meta_no_ar: false })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()

    return NextResponse.json({ vehicle })
  } catch (e) {
    console.error('[meta] pausar/reativar falhou:', e)
    return NextResponse.json({ error: 'Não foi possível concluir agora.' }, { status: 500 })
  }
}

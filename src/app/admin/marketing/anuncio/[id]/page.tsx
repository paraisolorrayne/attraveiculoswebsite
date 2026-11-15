import { notFound, redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import { PERIODOS_DA_META, type PeriodoDaMeta } from '@/lib/meta-ads'
import { AnuncioDetalhe } from './anuncio-detalhe'

/** O tipo diz texto, mas o driver devolve Date para coluna `date`. */
function diaDe(v: unknown): string | null {
  if (!v) return null
  return (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10)
}

/**
 * Página do anúncio (15/11/2026): as métricas da Meta de um card do Marketing
 * em tela cheia. Antes abria num painel lateral estreito, que não dava para
 * comparar os dias nem ler as tabelas.
 */
export default async function AnuncioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periodo?: string }>
}) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  if (!canAccessRoute(admin.role, '/admin/marketing', admin.secoes)) redirect('/admin')

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const card = await db
    .selectFrom('campaign_vehicles as v')
    .innerJoin('marketing_campaigns as c', 'c.id', 'v.campaign_id')
    .select(['v.id', 'v.vehicle_name', 'v.notes', 'v.status', 'v.added_date', 'v.end_reason', 'v.meta_ad_ids', 'v.meta_no_ar', 'c.id as campanha_id', 'c.name as campanha'])
    .where('v.id', '=', id)
    .executeTakeFirst()
  if (!card || card.meta_ad_ids.length === 0) notFound()

  const { periodo } = await searchParams
  const inicial: PeriodoDaMeta = periodo && periodo in PERIODOS_DA_META ? (periodo as PeriodoDaMeta) : '30d'

  return (
    <AnuncioDetalhe
      card={{
        id: card.id,
        carro: card.vehicle_name,
        campanha: card.campanha,
        campanhaId: card.campanha_id,
        encerrado: card.status !== 'publicada',
        noAr: card.meta_no_ar,
        emTroca: card.end_reason === 'troca_criativo',
        anuncios: card.meta_ad_ids.length,
        // A coluna é date: o driver pode devolver Date ou texto.
        desde: diaDe(card.added_date),
      }}
      periodoInicial={inicial}
    />
  )
}

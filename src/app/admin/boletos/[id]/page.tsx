import { notFound, redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { hojeBRT } from '@/lib/boletos'
import { buscarBoleto } from '@/lib/boletos-db'
import { BoletoDetalhe } from './boleto-detalhe'

export default async function BoletoPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin/login')
  if (!canAccessRoute(admin.role, '/admin/boletos', admin.secoes)) redirect('/admin')

  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound()
  const achado = await buscarBoleto(id)
  if (!achado) notFound()

  // `key` pelo horário da última mudança: depois de salvar, a página recarrega
  // os dados e a tela recomeça com eles (o texto do lembrete inclusive).
  return <BoletoDetalhe key={achado.boleto.atualizado_em} boleto={achado.boleto} eventos={achado.eventos} hoje={hojeBRT()} />
}

import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { GeradorCriativosAdmin } from './gerador-criativos-admin'

export default async function GeradorCriativosPage({
  searchParams,
}: {
  searchParams: Promise<{ veiculo?: string }>
}) {
  const admin = await getCurrentAdmin()

  if (!admin) {
    redirect('/admin/login')
  }

  // `?veiculo=<id>`: a tela inicial manda o carro para já abrir escolhido.
  const { veiculo } = await searchParams
  const veiculoInicial = veiculo && /^\d{1,12}$/.test(veiculo) ? veiculo : undefined

  return <GeradorCriativosAdmin usuarioId={admin.id} veiculoInicial={veiculoInicial} />
}

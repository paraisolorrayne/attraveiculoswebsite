import { SessaoDetalhe } from '@/app/admin/visitors/sessoes/[id]/sessao-detalhe'

export const metadata = { title: 'Sessão — Marketing da agência' }

/** Uma sessão das campanhas da agência (a API devolve 404 para as de fora). */
export default async function SessaoAgenciaPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	return <SessaoDetalhe sessionId={decodeURIComponent(id)} />
}

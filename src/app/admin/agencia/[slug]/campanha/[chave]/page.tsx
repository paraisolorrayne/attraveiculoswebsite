import { CampanhaPainel } from '@/app/admin/visitors/campanha/[chave]/campanha-painel'

export const metadata = { title: 'Campanha — Marketing da agência' }

/** O detalhe da campanha do painel de Visitantes, com o escopo da agência. */
export default async function CampanhaAgenciaPage({ params }: { params: Promise<{ chave: string }> }) {
	const { chave } = await params
	return <CampanhaPainel chave={decodeURIComponent(chave)} />
}

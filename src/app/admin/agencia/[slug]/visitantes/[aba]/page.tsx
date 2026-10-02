import { notFound } from 'next/navigation'
import { AbasVisitantes } from './abas-visitantes'
import { ABAS_VISITANTES } from './abas'

export const metadata = { title: 'Visitantes — Marketing da agência' }

export default async function VisitantesAgenciaPage({ params }: { params: Promise<{ aba: string }> }) {
	const { aba } = await params
	if (!ABAS_VISITANTES.some(a => a.aba === aba)) notFound()
	return <AbasVisitantes aba={aba} />
}

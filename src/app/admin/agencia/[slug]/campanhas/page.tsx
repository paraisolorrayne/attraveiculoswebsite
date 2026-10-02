import { CampanhasAgencia } from './campanhas-agencia'

export const metadata = { title: 'Campanhas — Marketing da agência' }

export default async function CampanhasPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params
	return <CampanhasAgencia slug={slug} />
}

import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { findConfianca } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, ShieldCheck } from 'lucide-react'

const data = findConfianca('garantia-e-procedencia')!

export const metadata: Metadata = {
	title: data.metaTitle,
	description: data.metaDescription,
	keywords: data.keywords,
	alternates: { canonical: `${SITE_URL}/garantia-e-procedencia` },
	openGraph: {
		title: data.metaTitle,
		description: data.metaDescription,
		url: `${SITE_URL}/garantia-e-procedencia`,
		type: 'website',
	},
}

export default function GarantiaProcedenciaPage() {
	const breadcrumbItems = [{ label: data.title }]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<ShieldCheck className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Confiança</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-3xl space-y-12">
						{data.sections.map((s, i) => (
							<div key={i}>
								<h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">{s.heading}</h2>
								<p className="text-foreground-secondary leading-relaxed">{s.content}</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16 bg-background-card border-t border-border">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-6">{data.ctaText}</h2>
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque <ArrowRight className="w-4 h-4" />
							</Link>
							<a
								href={getWhatsAppUrl('Olá! Gostaria de saber mais sobre a garantia e procedência dos veículos.')}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Falar no WhatsApp
							</a>
						</div>
						<div className="flex flex-wrap justify-center gap-4 text-sm">
							<Link href="/por-que-comprar-na-attra" className="text-primary hover:underline">Por Que a Attra</Link>
							<Link href="/como-funciona-entrega-brasil" className="text-primary hover:underline">Como Funciona a Entrega</Link>
							<Link href="/importacao-de-veiculos-de-luxo" className="text-primary hover:underline">Importação</Link>
						</div>
					</div>
				</Container>
			</section>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'WebPage',
						name: data.title,
						description: data.metaDescription,
						url: `${SITE_URL}/garantia-e-procedencia`,
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

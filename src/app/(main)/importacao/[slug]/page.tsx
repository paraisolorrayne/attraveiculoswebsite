import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { IMPORTACAO_MARCAS, findImportacaoMarca } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, Globe, Check, Clock, DollarSign } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return IMPORTACAO_MARCAS.map(m => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findImportacaoMarca(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/importacao/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/importacao/${slug}`,
			type: 'website',
		},
	}
}

export default async function ImportacaoMarcaPage({ params }: PageProps) {
	const { slug } = await params
	const data = findImportacaoMarca(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Importação', href: '/importacao-de-veiculos-de-luxo' },
		{ label: data.brand },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<Globe className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Importação {data.brand}</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							Importação {data.brand}
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-6">
							{data.intro}
						</p>
						<a
							href={getWhatsAppUrl(`Olá! Tenho interesse em importar um ${data.brand}. Gostaria de mais informações. [ref: /importacao/${data.slug}]`)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
						>
							<MessageCircle className="w-4 h-4" />
							{data.ctaText}
						</a>
					</div>
				</Container>
			</section>

			{/* Modelos importáveis */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">Modelos que Podem Ser Importados</h2>
					<div className="flex flex-wrap gap-3">
						{data.modelosImportaveis.map(m => (
							<span key={m} className="px-4 py-2 bg-background-card border border-border rounded-lg text-sm font-medium text-foreground">
								{data.brand} {m}
							</span>
						))}
					</div>
				</Container>
			</section>

			{/* Vantagens */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">Vantagens da Importação</h2>
						<ul className="space-y-3">
							{data.vantagens.map((v, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
									{v}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Prazo e custo */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
						<div className="p-6 bg-background border border-border rounded-xl">
							<div className="flex items-center gap-2 mb-3">
								<Clock className="w-5 h-5 text-primary" />
								<h3 className="text-lg font-bold text-foreground">Prazo Médio</h3>
							</div>
							<p className="text-foreground-secondary text-sm leading-relaxed">{data.prazoMedio}</p>
						</div>
						<div className="p-6 bg-background border border-border rounded-xl">
							<div className="flex items-center gap-2 mb-3">
								<DollarSign className="w-5 h-5 text-primary" />
								<h3 className="text-lg font-bold text-foreground">Custo Estimado</h3>
							</div>
							<p className="text-foreground-secondary text-sm leading-relaxed">{data.custoEstimado}</p>
						</div>
					</div>
				</Container>
			</section>

			{/* CTA final */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Importar {data.brand} com a Attra
						</h2>
						<p className="text-foreground-secondary mb-6">
							Receba um orçamento completo e transparente para importação do seu {data.brand}.
						</p>
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							<a
								href={getWhatsAppUrl(`Olá! Quero um orçamento para importar um ${data.brand}. [ref: /importacao/${data.slug}]`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								{data.ctaText}
							</a>
							<Link
								href="/importacao-de-veiculos-de-luxo"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Sobre importação <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
						<div className="flex flex-wrap justify-center gap-4 text-sm">
							<Link href="/comprar/preco/acima-de-1-milhao" className="text-primary hover:underline">Acima de R$ 1 Milhão</Link>
							<Link href="/comprar/condicao/supercarros-seminovos" className="text-primary hover:underline">Supercarros Seminovos</Link>
							<Link href="/por-que-comprar-na-attra" className="text-primary hover:underline">Por Que a Attra</Link>
							<Link href="/veiculos" className="text-primary hover:underline">Ver Estoque</Link>
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
						name: `Importação ${data.brand}`,
						description: data.metaDescription,
						url: `${SITE_URL}/importacao/${slug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
								{ '@type': 'ListItem', position: 2, name: 'Importação', item: `${SITE_URL}/importacao-de-veiculos-de-luxo` },
								{ '@type': 'ListItem', position: 3, name: data.brand, item: `${SITE_URL}/importacao/${slug}` },
							],
						},
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FAIXAS_PRECO, findFaixaPreco } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, Banknote } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return FAIXAS_PRECO.map(f => ({ slug: f.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findFaixaPreco(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/preco/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comprar/preco/${slug}`,
			type: 'website',
		},
	}
}

export default async function FaixaPrecoPage({ params }: PageProps) {
	const { slug } = await params
	const data = findFaixaPreco(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Faixa de Preço' },
		{ label: data.title },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<Banknote className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Faixa de Preço</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-6">
							{data.oQueDaPraComprar}
						</p>
						<a
							href={getWhatsAppUrl(`Olá! Estou buscando veículos na faixa de ${data.title.replace('Carros de Luxo de ', '').replace('Carros de Luxo ', '')}. [ref: /comprar/preco/${data.slug}]`)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
						>
							<MessageCircle className="w-4 h-4" />
							{data.ctaPrimario}
						</a>
					</div>
				</Container>
			</section>

			{/* Categorias com modelos */}
			{data.categorias.map(cat => (
				<section key={cat.nome} className="py-12 lg:py-16 border-b border-border">
					<Container>
						<h2 className="text-2xl font-bold text-foreground mb-2">{cat.nome}</h2>
						<p className="text-foreground-secondary mb-6">{cat.descricao}</p>
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
							{cat.modelos.map(m => (
								<Link
									key={m.href}
									href={m.href}
									className="group p-4 bg-background-card border border-border rounded-lg hover:border-primary/40 transition-all"
								>
									<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
										{m.nome}
									</h3>
									<span className="text-xs text-foreground-secondary flex items-center gap-1 mt-1">
										Ver detalhes <ArrowRight className="w-3 h-3" />
									</span>
								</Link>
							))}
						</div>
					</Container>
				</section>
			))}

			{/* Perfil do comprador */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-4">Perfil Típico do Comprador</h2>
						<p className="text-foreground-secondary leading-relaxed">{data.perfilComprador}</p>
					</div>
				</Container>
			</section>

			{/* CTA final */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-6">
							Encontre o Veículo Ideal na Sua Faixa
						</h2>
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							<a
								href={getWhatsAppUrl(`Olá! Quero receber opções de veículos na faixa de ${data.title.replace('Carros de Luxo de ', '').replace('Carros de Luxo ', '')}. [ref: /comprar/preco/${data.slug}]`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								{data.ctaSecundario}
							</a>
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
						<div className="flex flex-wrap justify-center gap-4 text-sm">
							<Link href="/comprar/condicao/seminovos-premium" className="text-primary hover:underline">Seminovos Premium</Link>
							<Link href="/importacao-de-veiculos-de-luxo" className="text-primary hover:underline">Importação</Link>
							<Link href="/por-que-comprar-na-attra" className="text-primary hover:underline">Por Que a Attra</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* JSON-LD */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'WebPage',
						name: data.title,
						description: data.metaDescription,
						url: `${SITE_URL}/comprar/preco/${slug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
								{ '@type': 'ListItem', position: 2, name: 'Comprar', item: `${SITE_URL}/comprar` },
								{ '@type': 'ListItem', position: 3, name: data.title, item: `${SITE_URL}/comprar/preco/${slug}` },
							],
						},
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

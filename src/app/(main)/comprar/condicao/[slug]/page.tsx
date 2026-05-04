import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CONDICOES, findCondicao } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, ShieldCheck, AlertTriangle, Check } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return CONDICOES.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findCondicao(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/condicao/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comprar/condicao/${slug}`,
			type: 'website',
		},
	}
}

export default async function CondicaoPage({ params }: PageProps) {
	const { slug } = await params
	const data = findCondicao(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Condição' },
		{ label: data.title },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-6">
							{data.definicao}
						</p>
						<a
							href={getWhatsAppUrl(`Olá! Gostaria de consultar ${data.title.toLowerCase()} disponíveis. [ref: /comprar/condicao/${data.slug}]`)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
						>
							<MessageCircle className="w-4 h-4" />
							Consultar disponibilidade
						</a>
					</div>
				</Container>
			</section>

			{/* Vantagens vs Zero KM */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-6">
							<Check className="w-5 h-5 text-green-500" />
							<h2 className="text-2xl font-bold text-foreground">Vantagens vs Zero KM</h2>
						</div>
						<ul className="space-y-3">
							{data.vantagensVsZeroKm.map((v, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
									{v}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Riscos do Mercado Aberto */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-6">
							<AlertTriangle className="w-5 h-5 text-amber-500" />
							<h2 className="text-2xl font-bold text-foreground">Riscos do Mercado Aberto</h2>
						</div>
						<ul className="space-y-3">
							{data.riscosMercadoAberto.map((r, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
									{r}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Como Attra Reduz Risco */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="flex items-center gap-2 mb-8">
						<ShieldCheck className="w-5 h-5 text-primary" />
						<h2 className="text-2xl font-bold text-foreground">Como a Attra Reduz o Risco</h2>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{data.comoAttraReduz.map(c => (
							<div key={c.aspecto} className="p-6 bg-background border border-border rounded-xl">
								<h3 className="text-lg font-bold text-foreground mb-3">{c.aspecto}</h3>
								<p className="text-sm text-foreground-secondary leading-relaxed">{c.descricao}</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Categorias Disponíveis */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">Categorias Disponíveis</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
						{data.categoriasDisponiveis.map(c => (
							<Link
								key={c.href}
								href={c.href}
								className="group p-4 bg-background-card border border-border rounded-lg hover:border-primary/40 transition-all text-center"
							>
								<span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
									{c.nome}
								</span>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* CTA final */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">{data.ctaText}</h2>
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo <ArrowRight className="w-4 h-4" />
							</Link>
							<a
								href={getWhatsAppUrl(`Olá! Gostaria de ver as opções de veículos disponíveis. [ref: /comprar/condicao/${data.slug}]`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Falar no WhatsApp
							</a>
						</div>
						<div className="flex flex-wrap justify-center gap-4 text-sm">
							<Link href="/importacao-de-veiculos-de-luxo" className="text-primary hover:underline">Importação</Link>
							<Link href="/por-que-comprar-na-attra" className="text-primary hover:underline">Por Que a Attra</Link>
							<Link href="/garantia-e-procedencia" className="text-primary hover:underline">Garantia e Procedência</Link>
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
						url: `${SITE_URL}/comprar/condicao/${slug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
								{ '@type': 'ListItem', position: 2, name: 'Comprar', item: `${SITE_URL}/comprar` },
								{ '@type': 'ListItem', position: 3, name: data.title, item: `${SITE_URL}/comprar/condicao/${slug}` },
							],
						},
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

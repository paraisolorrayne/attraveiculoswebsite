import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PERFIS_COMPRADOR, findPerfil } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, User, MessageCircle, AlertTriangle, Check, X } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return PERFIS_COMPRADOR.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findPerfil(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/perfil/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comprar/perfil/${slug}`,
			type: 'website',
		},
	}
}

export default async function PerfilPage({ params }: PageProps) {
	const { slug } = await params
	const data = findPerfil(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Perfil' },
		{ label: data.title },
	]

	return (
		<main>
			{/* Hero + CTA topo */}
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<User className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Perfil do Comprador</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-6">
							{data.contexto}
						</p>
						<a
							href={getWhatsAppUrl(`Olá! Estou buscando um ${data.title.toLowerCase()}. Podem me ajudar?`)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
						>
							<MessageCircle className="w-4 h-4" />
							Consultar especialista
						</a>
					</div>
				</Container>
			</section>

			{/* O que prioriza */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">O Que Esse Cliente Prioriza</h2>
						<ul className="space-y-3">
							{data.prioridades.map((p, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
									{p}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Critérios técnicos */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">Critérios Técnicos de Decisão</h2>
						<ul className="space-y-3">
							{data.criteriosTecnicos.map((c, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
									{c}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Erros comuns */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-6">
							<AlertTriangle className="w-5 h-5 text-amber-500" />
							<h2 className="text-2xl font-bold text-foreground">Erros Comuns</h2>
						</div>
						<ul className="space-y-3">
							{data.errosComuns.map((e, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<X className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
									{e}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Modelos ideais */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">Modelos Ideais</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{data.modelosIdeais.map(m => (
							<Link
								key={m.href}
								href={m.href}
								className="group p-6 bg-background border border-border rounded-xl hover:border-primary/40 transition-all"
							>
								<h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2">
									{m.nome}
								</h3>
								<p className="text-sm text-foreground-secondary">{m.motivo}</p>
								<span className="text-xs text-primary flex items-center gap-1 mt-3">
									Ver detalhes <ArrowRight className="w-3 h-3" />
								</span>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* Quando NÃO escolher */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-4">
							<AlertTriangle className="w-5 h-5 text-amber-500" />
							<h2 className="text-xl font-bold text-foreground">Quando NÃO Escolher Esse Tipo</h2>
						</div>
						<p className="text-foreground-secondary leading-relaxed">{data.quandoNaoEscolher}</p>
					</div>
				</Container>
			</section>

			{/* CTA meio */}
			<section className="py-12 lg:py-16 bg-background-card border-b border-border">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Encontre o Veículo Ideal Para Seu Perfil
						</h2>
						<p className="text-foreground-secondary mb-6">{data.ctaText}</p>
						<div className="flex flex-wrap justify-center gap-4">
							<a
								href={getWhatsAppUrl(`Olá! Preciso de ajuda para escolher um ${data.title.toLowerCase()}.`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Falar no WhatsApp
							</a>
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* Links internos */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-lg font-bold text-foreground mb-4">Explore Mais</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						<Link href="/comprar/preco/400-a-600-mil" className="text-sm text-primary hover:underline">R$ 400 a R$ 600 mil</Link>
						<Link href="/comprar/preco/600-a-1-milhao" className="text-sm text-primary hover:underline">R$ 600 mil a R$ 1 milhão</Link>
						<Link href="/comprar/preco/acima-de-1-milhao" className="text-sm text-primary hover:underline">Acima de R$ 1 milhão</Link>
						<Link href="/comprar/condicao/seminovos-premium" className="text-sm text-primary hover:underline">Seminovos Premium</Link>
						<Link href="/importacao-de-veiculos-de-luxo" className="text-sm text-primary hover:underline">Importação</Link>
						<Link href="/por-que-comprar-na-attra" className="text-sm text-primary hover:underline">Por Que a Attra</Link>
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
						url: `${SITE_URL}/comprar/perfil/${slug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
								{ '@type': 'ListItem', position: 2, name: 'Comprar', item: `${SITE_URL}/comprar` },
								{ '@type': 'ListItem', position: 3, name: data.title, item: `${SITE_URL}/comprar/perfil/${slug}` },
							],
						},
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

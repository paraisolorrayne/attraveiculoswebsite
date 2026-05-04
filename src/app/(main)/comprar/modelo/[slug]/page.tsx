import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { MODELOS, findModelo } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, Car, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return MODELOS.map(m => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findModelo(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/modelo/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comprar/modelo/${slug}`,
			type: 'website',
		},
	}
}

export default async function ModeloPage({ params }: PageProps) {
	const { slug } = await params
	const data = findModelo(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Modelo' },
		{ label: `${data.brand} ${data.model}` },
	]

	return (
		<main>
			{/* Hero + CTA topo */}
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<Car className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">{data.brand}</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.brand} {data.model} à Venda no Brasil
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-6">
							{data.resumo}
						</p>
						<div className="flex flex-wrap gap-3">
							<a
								href={getWhatsAppUrl(`Olá! Tenho interesse no ${data.brand} ${data.model}. Gostaria de saber sobre disponibilidade.`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Consultar disponibilidade
							</a>
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo
								<ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* Versões disponíveis */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">Versões Disponíveis</h2>
					<div className="flex flex-wrap gap-3">
						{data.versoes.map(v => (
							<span key={v} className="px-4 py-2 bg-background-card border border-border rounded-lg text-sm font-medium text-foreground">
								{data.brand} {data.model} {v}
							</span>
						))}
					</div>
				</Container>
			</section>

			{/* Faixa de preço */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">Faixa de Preço no Brasil</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
						<div className="p-6 bg-background-card border border-border rounded-xl">
							<h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Novo (zero km)</h3>
							<p className="text-xl font-bold text-foreground">{data.faixaPreco.novo}</p>
						</div>
						<div className="p-6 bg-background-card border border-border rounded-xl">
							<h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider mb-2">Seminovo</h3>
							<p className="text-xl font-bold text-foreground">{data.faixaPreco.seminovo}</p>
						</div>
					</div>
					<p className="mt-4 text-sm text-foreground-secondary">
						<Link href={`/preco/${slug}-brasil`} className="text-primary hover:underline">
							Ver análise completa de preço do {data.brand} {data.model} no Brasil →
						</Link>
					</p>
				</Container>
			</section>

			{/* Diferenciais */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">Diferenciais</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{data.diferenciais.map(d => (
							<div key={d.label} className="p-6 bg-background-card border border-border rounded-xl">
								<h3 className="text-lg font-bold text-foreground mb-3">{d.label}</h3>
								<p className="text-sm text-foreground-secondary leading-relaxed">{d.texto}</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Perfil ideal + Quando NÃO comprar */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
						<div className="p-6 bg-background-card border border-border rounded-xl">
							<div className="flex items-center gap-2 mb-4">
								<ShieldCheck className="w-5 h-5 text-green-500" />
								<h2 className="text-xl font-bold text-foreground">Perfil Ideal de Comprador</h2>
							</div>
							<p className="text-foreground-secondary leading-relaxed">{data.perfilIdeal}</p>
						</div>
						<div className="p-6 bg-background-card border border-border rounded-xl">
							<div className="flex items-center gap-2 mb-4">
								<AlertTriangle className="w-5 h-5 text-amber-500" />
								<h2 className="text-xl font-bold text-foreground">Quando NÃO Comprar</h2>
							</div>
							<p className="text-foreground-secondary leading-relaxed">{data.quandoNaoComprar}</p>
						</div>
					</div>
				</Container>
			</section>

			{/* CTA meio */}
			<section className="py-12 lg:py-16 bg-background-card border-b border-border">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Interessado no {data.brand} {data.model}?
						</h2>
						<p className="text-foreground-secondary mb-6">
							Consulte disponibilidade e condições diretamente com um especialista Attra.
						</p>
						<a
							href={getWhatsAppUrl(`Olá! Gostaria de saber mais sobre o ${data.brand} ${data.model} disponível na Attra.`)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
						>
							<MessageCircle className="w-4 h-4" />
							Falar no WhatsApp
						</a>
					</div>
				</Container>
			</section>

			{/* FAQ */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-8">
							<HelpCircle className="w-5 h-5 text-primary" />
							<h2 className="text-2xl font-bold text-foreground">Perguntas Frequentes</h2>
						</div>
						<div className="space-y-6">
							{data.faq.map((item, i) => (
								<div key={i} className="border-b border-border pb-6 last:border-b-0">
									<h3 className="text-lg font-semibold text-foreground mb-2">{item.pergunta}</h3>
									<p className="text-foreground-secondary leading-relaxed">{item.resposta}</p>
								</div>
							))}
						</div>
					</div>
				</Container>
			</section>

			{/* Modelos relacionados */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-xl font-bold text-foreground mb-6">Modelos Relacionados</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{data.modelosRelacionados.map(m => (
							<Link
								key={m.href}
								href={m.href}
								className="group p-4 bg-background-card border border-border rounded-lg hover:border-primary/40 transition-all"
							>
								<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
									{m.nome}
								</h3>
								<span className="text-xs text-foreground-secondary flex items-center gap-1 mt-1">
									Ver opções <ArrowRight className="w-3 h-3" />
								</span>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* Links internos */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-lg font-bold text-foreground mb-4">Explore Mais</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						<Link href={`/preco/${slug}-brasil`} className="text-sm text-primary hover:underline">Preço do {data.model} no Brasil</Link>
						<Link href="/comprar/condicao/seminovos-premium" className="text-sm text-primary hover:underline">Seminovos Premium</Link>
						<Link href="/importacao-de-veiculos-de-luxo" className="text-sm text-primary hover:underline">Importação de Veículos</Link>
						<Link href="/por-que-comprar-na-attra" className="text-sm text-primary hover:underline">Por Que Comprar na Attra</Link>
						<Link href="/veiculos" className="text-sm text-primary hover:underline">Ver Estoque Completo</Link>
						<Link href="/garantia-e-procedencia" className="text-sm text-primary hover:underline">Garantia e Procedência</Link>
					</div>
				</Container>
			</section>

			{/* CTA final */}
			<section className="py-12 lg:py-16 bg-background-card">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Encontre o {data.brand} {data.model} Ideal
						</h2>
						<p className="text-foreground-secondary mb-8">
							A Attra Veículos oferece curadoria de {data.brand} {data.model} com procedência verificada e entrega nacional.
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver estoque completo
								<ArrowRight className="w-4 h-4" />
							</Link>
							<a
								href={getWhatsAppUrl(`Olá! Quero encontrar o ${data.brand} ${data.model} ideal. Podem me ajudar?`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Falar no WhatsApp
							</a>
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
						name: `${data.brand} ${data.model} à Venda no Brasil`,
						description: data.metaDescription,
						url: `${SITE_URL}/comprar/modelo/${slug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
								{ '@type': 'ListItem', position: 2, name: 'Comprar', item: `${SITE_URL}/comprar` },
								{ '@type': 'ListItem', position: 3, name: `${data.brand} ${data.model}`, item: `${SITE_URL}/comprar/modelo/${slug}` },
							],
						},
						mainEntity: {
							'@type': 'Product',
							name: `${data.brand} ${data.model}`,
							brand: { '@type': 'Brand', name: data.brand },
							offers: {
								'@type': 'AggregateOffer',
								priceCurrency: 'BRL',
								availability: 'https://schema.org/InStock',
								seller: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
							},
						},
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { GUIAS_OPERACIONAIS, findGuiaOperacional } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, BookOpen, MessageCircle } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return GUIAS_OPERACIONAIS.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findGuiaOperacional(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/guia/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/guia/${slug}`,
			type: 'article',
		},
	}
}

export default async function GuiaPage({ params }: PageProps) {
	const { slug } = await params
	const data = findGuiaOperacional(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Guia' },
		{ label: data.title },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<BookOpen className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Guia</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
					</div>
				</Container>
			</section>

			{/* Table of Contents */}
			<section className="py-8 border-b border-border">
				<Container>
					<nav className="max-w-3xl">
						<h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Neste guia</h2>
						<ol className="space-y-1">
							{data.sections.map((s, i) => (
								<li key={i}>
									<a href={`#section-${i}`} className="text-sm text-foreground-secondary hover:text-primary transition-colors">
										{s.heading}
									</a>
								</li>
							))}
						</ol>
					</nav>
				</Container>
			</section>

			{/* Content Sections */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-3xl space-y-12">
						{data.sections.map((s, i) => (
							<div key={i} id={`section-${i}`}>
								<h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">{s.heading}</h2>
								<p className="text-foreground-secondary leading-relaxed">{s.content}</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Modelos compatíveis */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<h2 className="text-xl font-bold text-foreground mb-6">Modelos Compatíveis</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{data.modelosCompativeis.map(m => (
							<Link
								key={m.href}
								href={m.href}
								className="group p-4 bg-background border border-border rounded-lg hover:border-primary/40 transition-all"
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

			{/* CTA */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							<a
								href={getWhatsAppUrl(`Olá! Li o guia sobre ${data.title.toLowerCase()} e gostaria de falar com um especialista.`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								{data.ctaPrimario}
							</a>
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								{data.ctaSecundario} <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
						<div className="flex flex-wrap justify-center gap-4 text-sm">
							<Link href="/comprar/condicao/supercarros-seminovos" className="text-primary hover:underline">Supercarros Seminovos</Link>
							<Link href="/importacao-de-veiculos-de-luxo" className="text-primary hover:underline">Importação</Link>
							<Link href="/garantia-e-procedencia" className="text-primary hover:underline">Garantia e Procedência</Link>
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
						'@type': 'Article',
						name: data.title,
						description: data.metaDescription,
						url: `${SITE_URL}/guia/${slug}`,
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
						publisher: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

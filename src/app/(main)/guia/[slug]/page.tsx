import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { GUIAS_COMPRA, findGuia } from '@/lib/seo-content'
import { SITE_URL } from '@/lib/constants'
import { ArrowRight, BookOpen } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return GUIAS_COMPRA.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findGuia(slug)
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
	const data = findGuia(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Guia' },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<BookOpen className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Guia de Compra</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							{data.title}
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed">
							{data.intro}
						</p>
					</div>
				</Container>
			</section>

			{/* Table of Contents */}
			<section className="py-8 border-b border-border">
				<Container>
					<nav className="max-w-3xl">
						<h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
							Neste guia
						</h2>
						<ol className="space-y-1">
							{data.sections.map((s, i) => (
								<li key={i}>
									<a
										href={`#section-${i}`}
										className="text-sm text-foreground-secondary hover:text-primary transition-colors"
									>
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
								<h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">
									{s.heading}
								</h2>
								<p className="text-foreground-secondary leading-relaxed">
									{s.content}
								</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* CTA + Related Links */}
			<section className="py-12 lg:py-16 bg-background-card border-t border-border">
				<Container>
					<div className="max-w-3xl mx-auto text-center mb-10">
						<Link
							href="/veiculos"
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
						>
							{data.ctaText}
							<ArrowRight className="w-4 h-4" />
						</Link>
					</div>
					<div className="max-w-3xl mx-auto">
						<h2 className="text-lg font-bold text-foreground mb-4">Links Relacionados</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
							{data.relatedLinks.map(l => (
								<Link
									key={l.href}
									href={l.href}
									className="group p-3 border border-border rounded-lg hover:border-primary/40 transition-all text-sm"
								>
									<span className="text-foreground group-hover:text-primary transition-colors font-medium">
										{l.label}
									</span>
								</Link>
							))}
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
						'@type': 'HowTo',
						name: data.title,
						description: data.metaDescription,
						url: `${SITE_URL}/guia/${slug}`,
						step: data.sections.map((s, i) => ({
							'@type': 'HowToStep',
							position: i + 1,
							name: s.heading,
							text: s.content,
						})),
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

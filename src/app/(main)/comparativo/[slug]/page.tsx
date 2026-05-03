import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { COMPARATIVOS, findComparativo } from '@/lib/seo-content'
import { SITE_URL } from '@/lib/constants'
import { ArrowRight, Check, X, Scale } from 'lucide-react'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
	return COMPARATIVOS.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findComparativo(slug)
	if (!data) return {}

	return {
		title: data.metaTitle,
		description: data.metaDescription,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/comparativo/${slug}` },
		openGraph: {
			title: data.metaTitle,
			description: data.metaDescription,
			url: `${SITE_URL}/comparativo/${slug}`,
			type: 'article',
		},
	}
}

export default async function ComparativoPage({ params }: PageProps) {
	const { slug } = await params
	const data = findComparativo(slug)
	if (!data) notFound()

	const breadcrumbItems = [
		{ label: 'Comprar', href: '/comprar' },
		{ label: 'Comparativo' },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<Scale className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Comparativo</span>
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

			{/* Specs Comparison */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{[data.carA, data.carB].map(car => (
							<div key={car.model} className="bg-background-card border border-border rounded-xl p-6 lg:p-8">
								<h2 className="text-2xl font-bold text-foreground mb-2">
									{car.brand} {car.model}
								</h2>
								<p className="text-sm text-foreground-secondary mb-6">{car.summary}</p>

								<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
									Especificações
								</h3>
								<div className="space-y-3 mb-8">
									{car.specs.map(s => (
										<div key={s.label} className="flex justify-between items-center text-sm border-b border-border pb-2">
											<span className="text-foreground-secondary">{s.label}</span>
											<span className="font-medium text-foreground">{s.value}</span>
										</div>
									))}
								</div>

								<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
									Pontos Fortes
								</h3>
								<ul className="space-y-2 mb-6">
									{car.pros.map(p => (
										<li key={p} className="flex items-start gap-2 text-sm text-foreground-secondary">
											<Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
											{p}
										</li>
									))}
								</ul>

								<h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
									Pontos a Considerar
								</h3>
								<ul className="space-y-2">
									{car.cons.map(c => (
										<li key={c} className="flex items-start gap-2 text-sm text-foreground-secondary">
											<X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
											{c}
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Verdict */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="max-w-3xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-6">Veredicto</h2>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-8">
							{data.verdict}
						</p>
						<Link
							href="/veiculos"
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
						>
							{data.ctaText}
							<ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</Container>
			</section>

			{/* Related Models */}
			{data.relatedModels.length > 0 && (
				<section className="py-12 lg:py-16">
					<Container>
						<h2 className="text-xl font-bold text-foreground mb-6">Modelos Relacionados</h2>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
							{data.relatedModels.map(m => (
								<Link
									key={m.href}
									href={m.href}
									className="group p-4 border border-border rounded-lg hover:border-primary/40 transition-all"
								>
									<span className="text-xs text-foreground-secondary">{m.brand}</span>
									<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
										{m.model}
									</h3>
								</Link>
							))}
						</div>
					</Container>
				</section>
			)}

			{/* JSON-LD */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: data.title,
						description: data.metaDescription,
						url: `${SITE_URL}/comparativo/${slug}`,
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
						publisher: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
						about: [
							{ '@type': 'Vehicle', name: `${data.carA.brand} ${data.carA.model}` },
							{ '@type': 'Vehicle', name: `${data.carB.brand} ${data.carB.model}` },
						],
					}),
				}}
			/>
		</main>
	)
}

import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { IMPORTACAO_MAIN, IMPORTACAO_MARCAS } from '@/lib/seo-content'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, Globe, Check, AlertTriangle } from 'lucide-react'

const data = IMPORTACAO_MAIN

export const metadata: Metadata = {
	title: data.metaTitle,
	description: data.metaDescription,
	keywords: data.keywords,
	alternates: { canonical: `${SITE_URL}/importacao-de-veiculos-de-luxo` },
	openGraph: {
		title: data.metaTitle,
		description: data.metaDescription,
		url: `${SITE_URL}/importacao-de-veiculos-de-luxo`,
		type: 'website',
	},
}

export default function ImportacaoPage() {
	const breadcrumbItems = [{ label: 'Importação' }]

	return (
		<main>
			{/* Hero + CTA topo */}
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<Globe className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Importação</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							Importação de Veículos de Luxo no Brasil
						</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed mb-6">
							{data.intro}
						</p>
						<a
							href={getWhatsAppUrl('Olá! Tenho interesse no serviço de importação de veículos. Gostaria de mais informações. [ref: /importacao-de-veiculos-de-luxo]')}
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

			{/* Etapas */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">Etapas do Processo</h2>
					<div className="max-w-3xl space-y-6">
						{data.etapas.map((e, i) => (
							<div key={i} className="flex gap-4">
								<div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
									{i + 1}
								</div>
								<div>
									<h3 className="text-lg font-bold text-foreground mb-1">{e.titulo}</h3>
									<p className="text-foreground-secondary leading-relaxed">{e.descricao}</p>
								</div>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Para quem faz sentido */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">Para Quem Faz Sentido</h2>
						<ul className="space-y-3">
							{data.paraQuemFazSentido.map((p, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
									{p}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Vantagens vs Brasil */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">Vantagens vs Comprar no Brasil</h2>
						<ul className="space-y-3">
							{data.vantagensVsBrasil.map((v, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
									{v}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Riscos e como a Attra resolve */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">Riscos e Como a Attra Resolve</h2>
					<div className="max-w-3xl space-y-6">
						{data.riscos.map((r, i) => (
							<div key={i} className="p-6 bg-background border border-border rounded-xl">
								<div className="flex items-start gap-3 mb-3">
									<AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
									<h3 className="font-bold text-foreground">{r.risco}</h3>
								</div>
								<p className="text-foreground-secondary text-sm leading-relaxed ml-8">{r.solucao}</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* Exemplos de veículos */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">Exemplos de Veículos Possíveis</h2>
						<ul className="space-y-2">
							{data.exemplosVeiculos.map((v, i) => (
								<li key={i} className="text-foreground-secondary flex items-center gap-2">
									<ArrowRight className="w-3 h-3 text-primary" />
									{v}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Subpáginas por marca */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">Importação por Marca</h2>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
						{IMPORTACAO_MARCAS.map(m => (
							<Link
								key={m.slug}
								href={`/importacao/${m.slug}`}
								className="group p-6 bg-background-card border border-border rounded-xl hover:border-primary/40 transition-all"
							>
								<h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
									{m.brand}
								</h3>
								<p className="text-sm text-foreground-secondary mb-3">
									{m.modelosImportaveis.slice(0, 3).join(', ')} e mais
								</p>
								<span className="text-xs text-primary flex items-center gap-1">
									Ver detalhes <ArrowRight className="w-3 h-3" />
								</span>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* CTA meio */}
			<section className="py-12 lg:py-16 bg-background-card border-b border-border">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Quer Importar um Veículo?
						</h2>
						<p className="text-foreground-secondary mb-6">
							Entre em contato e receba um orçamento detalhado sem compromisso.
						</p>
						<a
							href={getWhatsAppUrl('Olá! Gostaria de receber um orçamento para importação de veículo. [ref: /importacao-de-veiculos-de-luxo]')}
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

			{/* Links internos */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-lg font-bold text-foreground mb-4">Explore Mais</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						<Link href="/comprar/modelo/porsche-911" className="text-sm text-primary hover:underline">Porsche 911</Link>
						<Link href="/comprar/preco/acima-de-1-milhao" className="text-sm text-primary hover:underline">Acima de R$ 1 Milhão</Link>
						<Link href="/comprar/condicao/supercarros-seminovos" className="text-sm text-primary hover:underline">Supercarros Seminovos</Link>
						<Link href="/por-que-comprar-na-attra" className="text-sm text-primary hover:underline">Por Que a Attra</Link>
						<Link href="/garantia-e-procedencia" className="text-sm text-primary hover:underline">Garantia e Procedência</Link>
						<Link href="/como-funciona-entrega-brasil" className="text-sm text-primary hover:underline">Entrega Nacional</Link>
						<Link href="/veiculos" className="text-sm text-primary hover:underline">Ver Estoque Completo</Link>
					</div>
				</Container>
			</section>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'WebPage',
						name: 'Importação de Veículos de Luxo no Brasil',
						description: data.metaDescription,
						url: `${SITE_URL}/importacao-de-veiculos-de-luxo`,
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

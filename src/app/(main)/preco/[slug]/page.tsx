import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PRECOS, findPreco } from '@/lib/seo'
import { pageTitle, IMAGEM_COMPARTILHAMENTO } from '@/lib/seo/page-metadata'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, DollarSign, TrendingUp } from 'lucide-react'
import { EstoqueDoModelo } from '@/components/vehicles/estoque-do-modelo'
import { estoqueDoModelo, fraseDoEstoque, resumoDoEstoque, AVISO_DE_PRECO } from '@/lib/seo/estoque-do-modelo'
import { formatarDataBR } from '@/lib/seo/frescor'

interface PageProps {
	params: Promise<{ slug: string }>
}

// Os preços do estoque saem no HTML: a página se refaz a cada 15 min, e a
// busca da AutoConf por baixo tem cache de 5.
export const revalidate = 900

export async function generateStaticParams() {
	return PRECOS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const data = findPreco(slug)
	if (!data) return {}

	// Com unidade à venda, a descrição já responde quanto custa.
	const frase = fraseDoEstoque(`${data.brand} ${data.model}`, resumoDoEstoque(await estoqueDoModelo(data.brand, data.model)))
	const description = frase
		? `${frase.replace(/\*/g, '')} (sujeito a atualização). Diferença entre versões, o que pesa no preço e se vale a pena.`
		: data.metaDescription

	return {
		title: pageTitle(data.metaTitle),
		description,
		keywords: data.keywords,
		alternates: { canonical: `${SITE_URL}/preco/${slug}` },
		openGraph: {
			images: [IMAGEM_COMPARTILHAMENTO],
			title: data.metaTitle,
			description,
			url: `${SITE_URL}/preco/${slug}`,
			type: 'article',
		},
	}
}

export default async function PrecoPage({ params }: PageProps) {
	const { slug } = await params
	const data = findPreco(slug)
	if (!data) notFound()

	const veiculos = await estoqueDoModelo(data.brand, data.model)
	const frase = fraseDoEstoque(`${data.brand} ${data.model}`, resumoDoEstoque(veiculos))
	const hoje = formatarDataBR(new Date().toISOString()) ?? ''

	const breadcrumbItems = [
		{ label: 'Preço' },
		{ label: `${data.brand} ${data.model}` },
	]

	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={breadcrumbItems} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<DollarSign className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Preço</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
							Preço do {data.brand} {data.model} no Brasil
						</h1>
						{/* A resposta primeiro: quantos há e por quanto, com a data. */}
						{frase ? (
							<>
								<p className="text-lg text-foreground leading-relaxed">
									Em {hoje}: <strong>{frase}</strong>. Abaixo, as unidades, a diferença entre versões e o que pesa no valor.
								</p>
								<p className="mt-2 text-xs text-foreground-secondary">*{AVISO_DE_PRECO}</p>
							</>
						) : (
							<p className="text-lg text-foreground-secondary leading-relaxed">
								Sem {data.brand} {data.model} à venda na Attra em {hoje}. Abaixo, a diferença entre versões, o que pesa no valor e como encomendar.
							</p>
						)}
					</div>
				</Container>
			</section>

			{/* Posicionamento de preço */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-4">Posicionamento de Preço</h2>
						<p className="text-foreground-secondary leading-relaxed mb-6">{data.faixaGeral}</p>
						<Link
							href={`/veiculos?search=${encodeURIComponent(`${data.brand} ${data.model}`)}`}
							className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
						>
							Consultar preço atual no estoque <ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</Container>
			</section>

			{/* Estoque ao vivo */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-6">
						Disponíveis na Attra Agora
					</h2>
					<EstoqueDoModelo veiculos={veiculos} marca={data.brand} modelo={data.model} conferidoEm={hoje} />
				</Container>
			</section>

			{/* Diferença entre versões */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-4">Diferença Entre Versões</h2>
						<p className="text-foreground-secondary leading-relaxed">{data.diferencaVersoes}</p>
					</div>
				</Container>
			</section>

			{/* Fatores que impactam preço */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-6">Fatores que Impactam o Preço</h2>
						<ul className="space-y-3">
							{data.fatoresPreco.map((f, i) => (
								<li key={i} className="flex items-start gap-3 text-foreground-secondary">
									<TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
									{f}
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			{/* Novo vs Seminovo */}
			<section className="py-12 lg:py-16 border-b border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-4">Novo vs Seminovo</h2>
						<p className="text-foreground-secondary leading-relaxed">{data.novoVsSeminovo}</p>
					</div>
				</Container>
			</section>

			{/* Vale a pena? */}
			<section className="py-12 lg:py-16 bg-background-card border-y border-border">
				<Container>
					<div className="max-w-3xl">
						<h2 className="text-2xl font-bold text-foreground mb-4">Vale a Pena?</h2>
						<p className="text-foreground-secondary leading-relaxed">{data.valeAPena}</p>
					</div>
				</Container>
			</section>

			{/* Link para estoque + CTA */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-2xl mx-auto text-center">
						<h2 className="text-2xl font-bold text-foreground mb-4">
							Consultar Disponibilidade
						</h2>
						<p className="text-foreground-secondary mb-6">
							Veja unidades de {data.brand} {data.model} disponíveis no estoque da Attra ou consulte um especialista.
						</p>
						<div className="flex flex-wrap justify-center gap-4 mb-8">
							<Link
								href={`/comprar/modelo/${data.modeloSlug}`}
								className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
							>
								Ver {data.brand} {data.model} disponíveis
								<ArrowRight className="w-4 h-4" />
							</Link>
							<a
								href={getWhatsAppUrl(`Olá! Gostaria de consultar disponibilidade e preço do ${data.brand} ${data.model}.`)}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
							>
								<MessageCircle className="w-4 h-4" />
								Consultar disponibilidade
							</a>
						</div>
						<div className="flex flex-wrap justify-center gap-4 text-sm">
							<Link href="/comprar/condicao/seminovos-premium" className="text-primary hover:underline">Seminovos Premium</Link>
							<Link href="/importacao-de-veiculos-de-luxo" className="text-primary hover:underline">Importação</Link>
							<Link href="/por-que-comprar-na-attra" className="text-primary hover:underline">Por Que Comprar na Attra</Link>
							<Link href="/veiculos" className="text-primary hover:underline">Estoque Completo</Link>
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
						name: `Preço ${data.brand} ${data.model} no Brasil`,
						description: data.metaDescription,
						url: `${SITE_URL}/preco/${slug}`,
						breadcrumb: {
							'@type': 'BreadcrumbList',
							itemListElement: [
								{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE_URL },
								{ '@type': 'ListItem', position: 2, name: `${data.brand} ${data.model}`, item: `${SITE_URL}/preco/${slug}` },
							],
						},
						author: { '@type': 'Organization', name: 'Attra Veículos', url: SITE_URL },
					}),
				}}
			/>
		</main>
	)
}

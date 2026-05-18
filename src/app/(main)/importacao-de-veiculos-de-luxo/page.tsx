import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { SectionKicker, SectionHeading } from '@/components/ui/brand'
import { IMPORTACAO_MAIN, IMPORTACAO_MARCAS } from '@/lib/seo'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, ChevronDown, MessageCircle, Globe, Check, ShieldCheck } from 'lucide-react'

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

const heroWhatsAppMessage =
	'Olá, Attra. Tenho interesse no serviço de importação de veículos de luxo. [ref: /importacao-de-veiculos-de-luxo]'
const ctaWhatsAppMessage =
	'Olá, Attra. Gostaria de receber um orçamento para importação de veículo. [ref: /importacao-de-veiculos-de-luxo]'

export default function ImportacaoPage() {
	const breadcrumbItems = [{ label: 'Importação' }]

	return (
		<main>
			{/* HERO — segue o padrão da página /servicos: badge pill + H1 grande
			    com palavra em text-metallic + descritivo + stats em 3 colunas +
			    CTAs (primary + outline). Background com blur circles primary. */}
			<section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
				<Container className="relative z-10 mb-8">
					<Breadcrumb items={breadcrumbItems} afterHero />
				</Container>

				{/* Background Pattern */}
				<div className="absolute inset-0 opacity-5">
					<div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
					<div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
				</div>

				<Container className="relative z-10">
					<div className="max-w-4xl mx-auto text-center">
						{/* Badge */}
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
							<Globe className="w-4 h-4 text-primary" />
							<span className="text-sm font-medium text-primary">
								Serviço Attra · Importação Premium
							</span>
						</div>

						{/* H1 com text-metallic em "Luxo" */}
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
							Importação de Veículos de{' '}
							<span className="text-metallic text-metallic-animate">Luxo</span>
						</h1>

						<p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
							{data.intro}
						</p>

						{/* Stats */}
						<div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-10">
							<div className="text-center">
								<p className="text-3xl lg:text-4xl font-bold text-primary">16+</p>
								<p className="text-sm text-foreground-secondary">Anos de Mercado</p>
							</div>
							<div className="text-center">
								<p className="text-3xl lg:text-4xl font-bold text-primary">60-90</p>
								<p className="text-sm text-foreground-secondary">Dias Prazo Médio</p>
							</div>
							<div className="text-center">
								<p className="text-3xl lg:text-4xl font-bold text-primary">27</p>
								<p className="text-sm text-foreground-secondary">Estados Atendidos</p>
							</div>
						</div>

						{/* CTAs */}
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button asChild size="lg" className="text-lg px-8 py-6">
								<a
									href={getWhatsAppUrl(heroWhatsAppMessage)}
									target="_blank"
									rel="noopener noreferrer"
								>
									<MessageCircle className="w-5 h-5 mr-2" />
									{data.ctaText}
								</a>
							</Button>
							<Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
								<a href="#etapas">
									Ver o Processo
									<ChevronDown className="w-5 h-5 ml-2" />
								</a>
							</Button>
						</div>
					</div>
				</Container>
			</section>

			{/* ETAPAS — header centralizado + grid 2 col com institutional-card. */}
			<section id="etapas" className="py-20 lg:py-28 bg-background">
				<Container size="2xl">
					<div className="text-center mb-14">
						<SectionKicker className="mb-4">Processo</SectionKicker>
						<SectionHeading as="h2" size="lg" className="mb-4">
							Etapas do processo
						</SectionHeading>
						<p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
							Cinco etapas conduzidas pela Attra, do sourcing internacional à
							entrega na sua porta.
						</p>
					</div>
					<div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
						{data.etapas.map((e, i) => (
							<div
								key={i}
								className="group institutional-card p-6 sm:p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
							>
								<div className="flex items-start gap-4">
									<div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center">
										<span className="text-primary font-bold text-lg tabular-nums">
											{String(i + 1).padStart(2, '0')}
										</span>
									</div>
									<div className="min-w-0">
										<h3 className="type-display-md text-lg sm:text-xl mb-2 group-hover:text-primary transition-colors">
											{e.titulo}
										</h3>
										<p className="text-foreground-secondary text-sm sm:text-base leading-relaxed">
											{e.descricao}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* PARA QUEM / VANTAGENS — duas colunas com institutional-card,
			    bullets com Check em primary (não verde solto). */}
			<section className="py-20 lg:py-28 bg-background-card border-y border-border">
				<Container size="2xl">
					<div className="grid gap-8 lg:gap-12 lg:grid-cols-2">
						<div className="institutional-card p-7 sm:p-9">
							<SectionKicker className="mb-4">Perfil</SectionKicker>
							<SectionHeading as="h2" size="md" className="mb-6">
								Para quem faz sentido
							</SectionHeading>
							<ul className="space-y-4">
								{data.paraQuemFazSentido.map((p, i) => (
									<li key={i} className="flex items-start gap-3 text-foreground-secondary">
										<Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
										<span>{p}</span>
									</li>
								))}
							</ul>
						</div>
						<div className="institutional-card p-7 sm:p-9">
							<SectionKicker className="mb-4">Comparativo</SectionKicker>
							<SectionHeading as="h2" size="md" className="mb-6">
								Vantagens vs comprar no Brasil
							</SectionHeading>
							<ul className="space-y-4">
								{data.vantagensVsBrasil.map((v, i) => (
									<li key={i} className="flex items-start gap-3 text-foreground-secondary">
										<Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
										<span>{v}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</Container>
			</section>

			{/* RISCOS — header centralizado + grid de cards.
			    Substitui AlertTriangle amber (alarmista, fora da paleta) por
			    ShieldCheck primary (mensagem positiva: "a Attra mitiga"). */}
			<section className="py-20 lg:py-28 bg-background">
				<Container size="2xl">
					<div className="text-center mb-14">
						<SectionKicker className="mb-4">Mitigação</SectionKicker>
						<SectionHeading as="h2" size="lg" className="mb-4">
							Riscos e como a Attra resolve
						</SectionHeading>
						<p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
							Cada risco da operação de importação é endereçado por um processo
							específico antes do compromisso de compra.
						</p>
					</div>
					<div className="grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2 max-w-5xl mx-auto">
						{data.riscos.map((r, i) => (
							<div
								key={i}
								className="institutional-card p-6 sm:p-7 hover:border-primary/30 transition-colors"
							>
								<div className="flex items-start gap-3 mb-3">
									<ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
									<h3 className="type-display-md text-base sm:text-lg">
										{r.risco}
									</h3>
								</div>
								<p className="text-foreground-secondary text-sm sm:text-base leading-relaxed pl-8">
									{r.solucao}
								</p>
							</div>
						))}
					</div>
				</Container>
			</section>

			{/* EXEMPLOS — header + lista limpa em duas colunas. */}
			<section className="py-20 lg:py-28 bg-background-card border-y border-border">
				<Container size="2xl">
					<div className="text-center mb-14">
						<SectionKicker className="mb-4">Acervo</SectionKicker>
						<SectionHeading as="h2" size="lg" className="mb-4">
							Exemplos de veículos possíveis
						</SectionHeading>
					</div>
					<ul className="grid gap-3 sm:gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
						{data.exemplosVeiculos.map((v, i) => (
							<li
								key={i}
								className="institutional-card flex items-center gap-3 px-5 py-4 text-foreground"
							>
								<ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
								<span className="text-sm sm:text-base">{v}</span>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* MARCAS — header centralizado + grid de cards institucionais. */}
			<section className="py-20 lg:py-28 bg-background">
				<Container size="2xl">
					<div className="text-center mb-14">
						<SectionKicker className="mb-4">Marcas</SectionKicker>
						<SectionHeading as="h2" size="lg" className="mb-4">
							Importação por marca
						</SectionHeading>
						<p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
							Páginas dedicadas com modelos importáveis, prazo médio e custo
							estimado por marca.
						</p>
					</div>
					<div className="grid gap-4 sm:gap-6 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{IMPORTACAO_MARCAS.map(m => (
							<Link
								key={m.slug}
								href={`/importacao/${m.slug}`}
								className="group institutional-card p-7 sm:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
							>
								<h3 className="type-display-md text-xl sm:text-2xl mb-3 group-hover:text-primary transition-colors">
									{m.brand}
								</h3>
								<p className="text-sm text-foreground-secondary mb-5 leading-relaxed">
									{m.modelosImportaveis.slice(0, 3).join(', ')} e mais
								</p>
								<span className="inline-flex items-center gap-1.5 text-sm text-primary font-medium">
									Ver detalhes
									<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
								</span>
							</Link>
						))}
					</div>
				</Container>
			</section>

			{/* CTA — bloco institucional com background sutil + CTA primary. */}
			<section className="py-20 lg:py-28 bg-gradient-to-b from-background-card to-background border-y border-border">
				<Container size="xl">
					<div className="text-center max-w-2xl mx-auto">
						<SectionKicker className="mb-4">Próximo passo</SectionKicker>
						<SectionHeading as="h2" size="lg" className="mb-4">
							Pronto para importar o seu veículo?
						</SectionHeading>
						<p className="text-foreground-secondary text-lg mb-8">
							Receba um orçamento detalhado, com prazo realista e custos
							projetados, sem compromisso de fechamento.
						</p>
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
							<Button asChild size="lg">
								<a
									href={getWhatsAppUrl(ctaWhatsAppMessage)}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2"
								>
									<MessageCircle className="w-4 h-4" />
									{data.ctaText}
								</a>
							</Button>
							<Link
								href="/veiculos"
								className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
							>
								Explorar estoque atual <ArrowRight className="w-4 h-4" />
							</Link>
						</div>
					</div>
				</Container>
			</section>

			{/* EXPLORE MAIS — links internos discretos no rodapé da página. */}
			<section className="py-16 bg-background">
				<Container size="2xl">
					<h2 className="type-display-md text-lg mb-6">Explore mais</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
						<Link href="/comprar/modelo/porsche-911" className="text-sm text-primary hover:underline">Porsche 911</Link>
						<Link href="/comprar/faixa-preco/acima-de-1-milhao" className="text-sm text-primary hover:underline">Acima de R$ 1 milhão</Link>
						<Link href="/comprar/condicao/supercarros-seminovos" className="text-sm text-primary hover:underline">Supercarros seminovos</Link>
						<Link href="/por-que-comprar-na-attra" className="text-sm text-primary hover:underline">Por que a Attra</Link>
						<Link href="/garantia-e-procedencia" className="text-sm text-primary hover:underline">Garantia e procedência</Link>
						<Link href="/como-funciona-entrega-brasil" className="text-sm text-primary hover:underline">Entrega nacional</Link>
						<Link href="/veiculos" className="text-sm text-primary hover:underline">Estoque completo</Link>
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

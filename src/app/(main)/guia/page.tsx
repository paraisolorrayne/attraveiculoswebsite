import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { GUIAS_OPERACIONAIS } from '@/lib/seo'
import { canonicalUrl, IMAGEM_COMPARTILHAMENTO, pageTitle } from '@/lib/seo/page-metadata'

/**
 * Hub dos guias (handoff de SEO de 02/11/2026). /guia dava 404 e os cinco guias,
 * mais o guia gratuito do supercarro, só existiam no sitemap: nenhum link
 * interno chegava neles.
 */

const TITULO = 'Guias Attra para comprar e manter carros de luxo'
const DESCRICAO = 'Guias da Attra Veículos sobre blindagem, seguro, placa preta, preservação e avaliação de carros de luxo, mais o guia gratuito para comprar um supercarro.'

export const metadata: Metadata = {
	title: pageTitle(TITULO),
	description: DESCRICAO,
	alternates: { canonical: canonicalUrl('/guia') },
	openGraph: { title: TITULO, description: DESCRICAO, url: canonicalUrl('/guia'), type: 'website', images: [IMAGEM_COMPARTILHAMENTO] },
}

const OUTROS = [
	{ titulo: 'Guia do supercarro (gratuito)', texto: 'Oito páginas sobre como comprar um supercarro com segurança, para baixar de graça.', href: '/guia-supercarro-gratis' },
	{ titulo: 'Glossário automotivo', texto: 'Biturbo, downforce, PDK, carbono cerâmico e outros termos técnicos.', href: '/glossario-automotivo' },
	{ titulo: 'Manual Attra', texto: 'Engenharia e performance, verbete a verbete.', href: '/manual-attra' },
	{ titulo: 'Onde comprar carros de luxo', texto: 'Loja, portal ou importação: o que muda em cada caminho.', href: '/onde-comprar-carros-de-luxo' },
]

export default function GuiasPage() {
	return (
		<main>
			<section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
				<Container>
					<Breadcrumb items={[{ label: 'Guias', href: '/guia' }]} className="mb-8" />
					<div className="max-w-3xl">
						<div className="flex items-center gap-2 mb-3">
							<BookOpen className="w-5 h-5 text-primary" />
							<span className="text-sm text-primary font-medium uppercase tracking-wider">Guias</span>
						</div>
						<h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">{TITULO}</h1>
						<p className="text-lg text-foreground-secondary leading-relaxed">
							O que a Attra aprendeu em quase duas décadas vendendo carros de luxo, organizado para quem vai comprar:
							quando blindar, como segurar, o que conferir na originalidade e como preservar o valor do carro.
						</p>
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-2xl font-bold text-foreground mb-8">Guias de compra e manutenção</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{GUIAS_OPERACIONAIS.map(guia => (
							<Link
								key={guia.slug}
								href={`/guia/${guia.slug}`}
								className="group p-6 bg-background-card border border-border rounded-xl hover:border-primary/40 transition-all"
							>
								<h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{guia.title}</h3>
								<p className="mt-2 text-sm text-foreground-secondary line-clamp-3">{guia.metaDescription}</p>
								<span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
									Ler o guia
									<ArrowRight className="w-4 h-4" />
								</span>
							</Link>
						))}
					</div>

					<h2 className="mt-16 text-2xl font-bold text-foreground mb-8">Para consultar</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						{OUTROS.map(item => (
							<Link key={item.href} href={item.href} className="group p-6 bg-background-card border border-border rounded-xl hover:border-primary/40 transition-all">
								<h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.titulo}</h3>
								<p className="mt-2 text-sm text-foreground-secondary">{item.texto}</p>
							</Link>
						))}
					</div>
				</Container>
			</section>
		</main>
	)
}

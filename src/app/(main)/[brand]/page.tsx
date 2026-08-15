import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findSEOBrand, getAllBrandSlugs } from '@/lib/seo-brands'
import { SITE_URL } from '@/lib/constants'
import { BrandLandingPage } from '@/components/brand/brand-landing-page'

/**
 * Página de marca na raiz: /ferrari, /lamborghini, /porsche…
 *
 * LISTA FECHADA, e isso não é detalhe de implementação. Uma rota dinâmica na
 * raiz captura QUALQUER caminho não resolvido do site — /contato, /blog, uma
 * página nova que alguém criar amanhã. Com `dynamicParams = false` só existem
 * os slugs devolvidos por generateStaticParams; todo o resto cai no 404 normal
 * do Next, e nenhuma rota futura fica escondida atrás desta.
 *
 * Efeito colateral desejado: publicar uma marca nova exige cadastrá-la em
 * SEO_BRANDS — que é exatamente o critério de escalabilidade dos specs
 * ("cadastrar marca, não criar página no código").
 */
export const dynamicParams = false

interface Props {
	params: Promise<{ brand: string }>
}

export async function generateStaticParams() {
	return getAllBrandSlugs().map(brand => ({ brand }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { brand: slug } = await params
	const brand = findSEOBrand(slug)
	if (!brand) return {}

	return {
		title: brand.metaTitle,
		description: brand.metaDescription,
		keywords: brand.keywords,
		alternates: { canonical: `${SITE_URL}/${slug}` },
		openGraph: {
			title: brand.metaTitle,
			description: brand.metaDescription,
			url: `${SITE_URL}/${slug}`,
			type: 'website',
		},
	}
}

export default async function MarcaPage({ params }: Props) {
	const { brand: slug } = await params
	if (!findSEOBrand(slug)) notFound()
	return <BrandLandingPage slug={slug} basePath="" />
}

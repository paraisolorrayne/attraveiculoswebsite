import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findSEOBrand } from '@/lib/seo-brands'
import { MARCAS_EDITORIAL, editorialDaMarca } from '@/lib/seo/marcas-editorial'
import { SITE_URL } from '@/lib/constants'
import { BrandEditorialPage } from '@/components/brand/brand-editorial-page'

/**
 * Página de marca na raiz: /ferrari, /lamborghini, /porsche…
 *
 * NÃO é /comprar/marca com outro endereço. Esta é a página informacional —
 * história, contexto, o que verificar num usado — e /comprar/marca é a
 * comercial, que é onde o anúncio pago cai. As duas coexistem por decisão de
 * 15/08/2026, e o que torna a coexistência legítima é o conteúdo ser diferente:
 * enquanto as duas rotas renderizavam o mesmo componente, o texto visível
 * diferia por uma palavra e elas disputavam a mesma busca.
 *
 * SÓ EXISTE MARCA COM EDITORIAL ESCRITO. `generateStaticParams` lê
 * MARCAS_EDITORIAL, não a lista de marcas: sem texto próprio, a página seria a
 * cópia que este arquivo inteiro existe para evitar. Land Rover, por exemplo,
 * está em SEO_BRANDS e continua atendida em /comprar/land-rover, mas não tem
 * página na raiz até alguém escrever o editorial dela.
 *
 * LISTA FECHADA, e isso não é detalhe de implementação. Uma rota dinâmica na
 * raiz captura QUALQUER caminho não resolvido do site — /contato, /blog, uma
 * página nova que alguém criar amanhã. Com `dynamicParams = false` só existem
 * os slugs devolvidos por generateStaticParams; todo o resto cai no 404 normal
 * do Next, e nenhuma rota futura fica escondida atrás desta.
 */
export const dynamicParams = false

interface Props {
	params: Promise<{ brand: string }>
}

export async function generateStaticParams() {
	return Object.keys(MARCAS_EDITORIAL).map(brand => ({ brand }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { brand: slug } = await params
	const brand = findSEOBrand(slug)
	const editorial = editorialDaMarca(slug)
	if (!brand || !editorial) return {}

	// Título e descrição PRÓPRIOS, não os de /comprar/marca. Duas páginas com o
	// mesmo title competem entre si no mesmo resultado de busca — era o que
	// acontecia quando as duas rotas liam brand.metaTitle.
	const description = `${editorial.resumo} Veja a história da ${brand.displayName}, os modelos e o que verificar antes de comprar uma usada.`

	return {
		title: editorial.titulo,
		description,
		keywords: [
			`${brand.name} história`,
			`sobre ${brand.name}`,
			`${brand.name} modelos`,
			`${brand.name} usada o que verificar`,
		],
		alternates: { canonical: `${SITE_URL}/${slug}` },
		openGraph: {
			title: editorial.titulo,
			description,
			url: `${SITE_URL}/${slug}`,
			type: 'website',
		},
	}
}

export default async function MarcaPage({ params }: Props) {
	const { brand: slug } = await params
	if (!findSEOBrand(slug) || !editorialDaMarca(slug)) notFound()
	return <BrandEditorialPage slug={slug} />
}

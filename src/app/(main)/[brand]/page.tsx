import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findSEOBrand } from '@/lib/seo-brands'
import { MARCAS_EDITORIAL, editorialDaMarca, flexao } from '@/lib/seo/marcas-editorial'
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
	const editorial = editorialDaMarca(slug)
	if (!editorial) return {}

	// Uma linha (Range Rover) não está em SEO_BRANDS: o nome vem dela própria.
	const brand = findSEOBrand(editorial.linha?.marcaBase ?? slug)
	if (!brand) return {}
	const nome = editorial.linha?.displayName ?? brand.displayName
	const g = flexao(editorial.genero)

	// Título e descrição PRÓPRIOS, não os de /comprar/marca. Duas páginas com o
	// mesmo title competem entre si no mesmo resultado de busca — era o que
	// acontecia quando as duas rotas liam brand.metaTitle.
	const description = `${editorial.resumo} Veja a história ${g.def === 'o' ? 'do' : 'da'} ${nome} e o que verificar antes de comprar ${g.indef} ${g.usado}.`

	return {
		title: editorial.titulo,
		description,
		keywords: [
			`${nome} história`,
			`sobre ${nome}`,
			`${nome} modelos`,
			`${nome} ${g.usado} o que verificar`,
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
	const editorial = editorialDaMarca(slug)
	// A marca-base precisa existir mesmo numa linha: é dela que vêm o estoque e
	// a página comercial.
	if (!editorial || !findSEOBrand(editorial.linha?.marcaBase ?? slug)) notFound()
	return <BrandEditorialPage slug={slug} />
}

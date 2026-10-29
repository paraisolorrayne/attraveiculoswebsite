import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBlogPost } from '@/lib/blog-api'
import { buildBlogPostSchemas } from '@/lib/blog-schema'
import { EducativoTemplate, CarReviewTemplate } from '@/components/blog'
import { InstagramEmbedProvider } from '@/components/blog/instagram-embed-provider'
import { DisponibilidadeReview } from '@/components/blog/disponibilidade-review'
import { canonicalUrl, IMAGEM_COMPARTILHAMENTO, pageTitle } from '@/lib/seo/page-metadata'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { corrigirLinksInternos, pedidoDoReview, situacaoDoReview, slugDaFicha } from '@/lib/blog-disponibilidade'
import { ordenarPorSemelhanca } from '@/lib/veiculos-semelhantes'
import type { Vehicle } from '@/types'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const post = await getBlogPost(slug)
	if (!post) notFound()

	// O fallback anterior era `https://www.attra.com.br`, domínio que não é o do
	// site: sem NEXT_PUBLIC_SITE_URL o canonical apontava para fora.
	const url = canonicalUrl(`/blog/${post.slug}`)

	return {
		// `meta_title` vem do banco e boa parte da base foi gravada já com a
		// marca no fim, que o template do layout raiz acrescenta de novo.
		title: pageTitle(post.seo.meta_title || post.title),
		description: post.seo.meta_description || post.excerpt,
		keywords: post.seo.keywords,
		openGraph: {
			title: post.title,
			description: post.excerpt,
			url,
			type: 'article',
			images: post.featured_image ? [post.featured_image] : [IMAGEM_COMPARTILHAMENTO],
			publishedTime: post.published_date,
		},
		alternates: {
			canonical: post.seo.canonical_url || url,
		},
	}
}

/**
 * Esta rota não pode ter um Suspense acima dela — nem loading.tsx próprio, nem o
 * da listagem (por isso a listagem mora em blog/(lista)/). Com o loading.tsx, a
 * resposta começava antes de a página decidir se o post existe: post
 * inexistente saía HTTP 200 com noindex (soft 404, e qualquer slug inventado
 * virava página) e os metadados iam para o <body>. Mesmo caso da ficha de
 * veículo (ver veiculo/[slug]/not-found.tsx).
 */
export default async function BlogPostPage({ params }: PageProps) {
	const { slug } = await params
	const post = await getBlogPost(slug)
	if (!post) {
		notFound()
	}

	// Estoque do momento: diz se o carro do review ainda está à venda e corrige
	// os links do texto para fichas de carros que já saíram (ver
	// src/lib/blog-disponibilidade.ts). Sem estoque, o post sai como está.
	let estoque: Vehicle[] | null = null
	try {
		estoque = (await loadListedInventory()).vehicles
	} catch (error) {
		console.error('blog: estoque indisponível para a disponibilidade do post', error)
	}

	const cr = post.car_review
	const fichaDoReview = slugDaFicha(cr?.availability?.stock_url)
	const content = corrigirLinksInternos(post.content, estoque, slug =>
		slug === fichaDoReview ? '#disponibilidade' : '/veiculos',
	)

	let template
	if (post.post_type === 'car_review') {
		const situacao = situacaoDoReview(post, estoque)
		// Marca, modelo e ano vêm do review, que é mais confiável que o slug da
		// ficha (há fichas como `sf90-2024-1062018`, sem a marca).
		const semelhantes = !estoque || !cr || situacao.tipo === 'a_venda' ? []
			: ordenarPorSemelhanca(estoque, pedidoDoReview(cr.brand, cr.model, cr.year)).slice(0, 4)
		template = (
			<CarReviewTemplate
				post={{ ...post, content }}
				vendido={situacao.tipo === 'vendido'}
				disponibilidade={<DisponibilidadeReview situacao={situacao} brand={cr?.brand} model={cr?.model} semelhantes={semelhantes} />}
			/>
		)
	} else {
		template = <EducativoTemplate post={{ ...post, content }} />
	}

	const schemas = buildBlogPostSchemas(post)

	return (
		<InstagramEmbedProvider>
			{schemas.map((schema, i) => (
				<script
					key={i}
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
				/>
			))}
			{template}
		</InstagramEmbedProvider>
	)
}

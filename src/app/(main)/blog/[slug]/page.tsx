import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBlogPost } from '@/lib/blog-api'
import { buildBlogPostSchemas } from '@/lib/blog-schema'
import { EducativoTemplate, CarReviewTemplate } from '@/components/blog'
import { InstagramEmbedProvider } from '@/components/blog/instagram-embed-provider'

interface PageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const post = await getBlogPost(slug)
	if (!post) {
		return {
			title: 'Post não encontrado | Blog Attra',
			description: 'O conteúdo que você procura não foi encontrado.',
		}
	}

	const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.attra.com.br'
	const url = `${baseUrl}/blog/${post.slug}`

	return {
		title: post.seo.meta_title || post.title,
		description: post.seo.meta_description || post.excerpt,
		keywords: post.seo.keywords,
		openGraph: {
			title: post.title,
			description: post.excerpt,
			url,
			type: 'article',
			images: post.featured_image ? [post.featured_image] : [],
			publishedTime: post.published_date,
		},
		alternates: {
			canonical: post.seo.canonical_url || url,
		},
	}
}

export default async function BlogPostPage({ params }: PageProps) {
	const { slug } = await params
	const post = await getBlogPost(slug)
	if (!post) {
		notFound()
	}

	// Render template based on post type
	const template = post.post_type === 'car_review'
		? <CarReviewTemplate post={post} />
		: <EducativoTemplate post={post} />

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

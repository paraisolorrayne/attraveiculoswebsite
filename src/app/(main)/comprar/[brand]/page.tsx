import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { findSEOBrand, getAllBrandSlugs } from '@/lib/seo-brands'
import { SITE_URL } from '@/lib/constants'
import { BrandLandingPage } from '@/components/brand/brand-landing-page'

interface BrandPageProps {
	params: Promise<{ brand: string }>
}

export async function generateStaticParams() {
	return getAllBrandSlugs().map(brand => ({ brand }))
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
	const { brand: slug } = await params
	const brand = findSEOBrand(slug)
	if (!brand) return {}

	return {
		title: brand.metaTitle,
		description: brand.metaDescription,
		keywords: brand.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/${slug}` },
		openGraph: {
			title: brand.metaTitle,
			description: brand.metaDescription,
			url: `${SITE_URL}/comprar/${slug}`,
			type: 'website',
		},
	}
}

export default async function BrandPage({ params }: BrandPageProps) {
	const { brand: slug } = await params
	if (!findSEOBrand(slug)) notFound()
	return <BrandLandingPage slug={slug} basePath="/comprar" />
}

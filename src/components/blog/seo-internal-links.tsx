'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { SEO_BRANDS } from '@/lib/seo-brands'

interface SEOInternalLinksProps {
	brand?: string
	model?: string
	title?: string
}

/**
 * Renders contextual internal links from blog posts to /comprar/ SEO pages.
 * Automatically matches the post's brand/model to available brand and model pages.
 */
export function SEOInternalLinks({ brand, model }: SEOInternalLinksProps) {
	const links: { label: string; href: string }[] = []

	if (brand) {
		const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '-')
		const matchedBrand = SEO_BRANDS.find(
			b => b.name.toLowerCase() === brand.toLowerCase() ||
				b.slug === normalizedBrand
		)

		if (matchedBrand) {
			links.push({
				label: `Comprar ${matchedBrand.displayName} no Brasil`,
				href: `/comprar/${matchedBrand.slug}`,
			})

			if (model) {
				const normalizedModel = model.toLowerCase().replace(/\s+/g, '-')
				const matchedModel = matchedBrand.models.find(
					m => m.name.toLowerCase() === model.toLowerCase() ||
						m.slug === normalizedModel ||
						model.toLowerCase().includes(m.name.toLowerCase())
				)
				if (matchedModel) {
					links.push({
						label: `${matchedModel.fullName} à Venda`,
						href: `/comprar/${matchedBrand.slug}/${matchedModel.slug}`,
					})
				}
			}

			for (const m of matchedBrand.models.slice(0, 3)) {
				const href = `/comprar/${matchedBrand.slug}/${m.slug}`
				if (!links.some(l => l.href === href)) {
					links.push({ label: m.fullName, href })
				}
			}
		}
	}

	links.push(
		{ label: 'Comprar Carros de Luxo no Brasil', href: '/comprar' },
		{ label: 'Como Comprar Carro de Luxo no Brasil', href: '/guia/como-comprar-carro-de-luxo-no-brasil' },
	)

	const uniqueLinks = links.filter(
		(l, i, arr) => arr.findIndex(x => x.href === l.href) === i
	).slice(0, 6)

	if (uniqueLinks.length === 0) return null

	return (
		<section className="py-10 lg:py-14 border-t border-border">
			<Container>
				<h3 className="text-lg font-semibold text-foreground mb-4">
					Páginas Relacionadas
				</h3>
				<div className="flex flex-wrap gap-3">
					{uniqueLinks.map(l => (
						<Link
							key={l.href}
							href={l.href}
							className="group inline-flex items-center gap-1.5 px-4 py-2 bg-background-card rounded-lg border border-border hover:border-primary/40 transition-colors text-sm"
						>
							<span className="text-foreground group-hover:text-primary transition-colors">
								{l.label}
							</span>
							<ArrowRight className="w-3 h-3 text-foreground-secondary group-hover:text-primary transition-colors" />
						</Link>
					))}
				</div>
			</Container>
		</section>
	)
}

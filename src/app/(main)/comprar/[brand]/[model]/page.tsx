import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { findSEOBrand, findSEOModel, getAllModelSlugs } from '@/lib/seo-brands'
import { acharModeloDoEstoque, modelosDoEstoque, veiculosDoModelo } from '@/lib/seo/modelos-do-estoque'
import { getVehicles } from '@/lib/autoconf-api'
import { findVehicleDatasheet } from '@/lib/vehicle-datasheet'
import { formatPrice, formatMileage } from '@/lib/utils'
import { SITE_URL } from '@/lib/constants'
import { availabilityFromStatus } from '@/lib/vehicle-schema'
import { organizationRef } from '@/lib/schema-entity'
import { ArrowRight, Calendar, Gauge, Zap, RotateCw, Shield, Check } from 'lucide-react'
import { ModelLandingPage, resolverModelo } from '@/components/brand/model-landing-page'
import { IMAGEM_COMPARTILHAMENTO, pageTitle } from '@/lib/seo/page-metadata'

interface ModelPageProps {
	params: Promise<{ brand: string; model: string }>
}

export async function generateStaticParams() {
	// Curadas + derivadas do estoque. As derivadas existem enquanto houver
	// unidade; quando o último carro do modelo sai, a rota deixa de ser gerada e
	// o acesso é redirecionado para a marca (ver abaixo) em vez de dar 404 numa
	// URL que pode estar indexada.
	const { vehicles } = await getVehicles({ tipo: 'carros', registros_por_pagina: 100 })
	const doEstoque = modelosDoEstoque(vehicles).map(m => ({ brand: m.brandSlug, model: m.modelSlug }))
	return [...getAllModelSlugs(), ...doEstoque]
}

export async function generateMetadata({ params }: ModelPageProps): Promise<Metadata> {
	const { brand: brandSlug, model: modelSlug } = await params
	const result = await resolverModelo(brandSlug, modelSlug)
	if (!result) return {}

	const { model } = result
	return {
		title: pageTitle(model.metaTitle),
		description: model.metaDescription,
		keywords: model.keywords,
		alternates: { canonical: `${SITE_URL}/comprar/${brandSlug}/${modelSlug}` },
		openGraph: {
			images: [IMAGEM_COMPARTILHAMENTO],
			title: model.metaTitle,
			description: model.metaDescription,
			url: `${SITE_URL}/comprar/${brandSlug}/${modelSlug}`,
			type: 'website',
		},
	}
}

/** Rota histórica, já indexada. Renderiza o mesmo componente da raiz. */
export default async function ModelPage({ params }: ModelPageProps) {
	const { brand: brandSlug, model: modelSlug } = await params
	if (!(await resolverModelo(brandSlug, modelSlug))) notFound()
	return <ModelLandingPage brandSlug={brandSlug} modelSlug={modelSlug} basePath="/comprar" />
}

import type { BlogPost as DBBlogPost } from './database'

// Re-export database types for convenience
export * from './database'

// Vehicle filters used in list/search pages
export interface VehicleFilters {
	brand?: string
	model?: string
	yearMin?: number
	yearMax?: number
	priceMin?: number
	priceMax?: number
	fuelType?: string
	transmission?: string
	mileageMax?: number
	bodyType?: string
	location?: string
	category?: string
	status?: string
}

// Pagination
export interface PaginationParams {
	page: number
	limit: number
}

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	limit: number
	totalPages: number
}

// Contact form data
export interface ContactFormData {
	name: string
	email: string
	phone?: string
	subject: string
	message: string
	vehicleId?: string
	sourcePage: string
}

// Geolocation data from IP
export interface GeoLocation {
	city: string
	region: string
	country: string
	ip?: string
}

// WhatsApp/N8N webhook payload
export interface WhatsAppWebhookPayload {
	eventType: 'chat_request' | 'vehicle_inquiry' | 'service_inquiry' | 'whatsapp_click'
	sourcePage: string
	context: {
		vehicleId?: string
		vehicleBrand?: string
		vehicleModel?: string
		vehicleYear?: string | number
		vehiclePrice?: number
		vehicleSlug?: string
		serviceType?: string
		blogCategory?: string
		scrollProgress?: number
		timeOnPage?: number
		userMessage?: string
	}
	// Enhanced fields for N8N agent
	pageUrl?: string
	userAgent?: string
	localTimestamp?: string
	sessionId?: string
	timestamp: string
	// Geolocation data
	geoLocation?: GeoLocation
}

// Webhook response type
export interface WebhookResponse {
	success: boolean
	message: string
}

// SEO metadata
export interface SEOData {
	title: string
	description: string
	canonical?: string
	ogImage?: string
	structuredData?: object
}

// Breadcrumb
export interface BreadcrumbItem {
	label: string
	href?: string
}

// Company information
export interface CompanyInfo {
	name: string
	description: string
	founded: number
	totalArea: string
	specializations: string[]
	brands: string[]
}

// Location hours
export interface LocationHours {
	monday: string
	tuesday: string
	wednesday: string
	thursday: string
	friday: string
	saturday: string
	sunday: string
}

// Blog post with optional extra presentation fields
export type BlogPostWithExtras = DBBlogPost & {
	cover_image?: string | null
	category?: string
}

// ===========================================
// DUAL BLOG SYSTEM TYPES
// ===========================================

export type BlogPostType = 'educativo' | 'car_review'

export interface BlogAuthor {
	name: string
	bio?: string
	avatar?: string
}

export interface PillarChildLink {
	slug: string
	label?: string
}

export interface EducativoFields {
	category: string // "Curadoria", "Mercado", "Dicas", "Lifestyle"
	topic: string
	seo_keyword: string
	// Pillar page support — when true, this post acts as a topical hub
	// linking to the listed children posts. Renders with TOC + collection schema.
	is_pillar?: boolean
	pillar_intro?: string // short HTML/markdown intro for TOC area
	pillar_children?: PillarChildLink[]
}

export interface CarReviewSpecs {
	engine: string
	power: string
	torque: string
	acceleration: string
	top_speed: string
	transmission: string
	// Campos expandidos
	weight?: string
	drivetrain?: string // Ex: "Tração traseira (RWD)"
	tires?: string // Ex: "Pirelli P Zero Corsa"
	brakes?: string // Ex: "Carbono-cerâmicos"
	fuel_consumption?: string
	trunk_capacity?: string
}

export interface CarReviewAvailability {
	in_stock: boolean
	price?: string
	stock_url?: string
}

// FAQ para SEO e LLMO
export interface CarReviewFAQ {
	question: string
	answer: string
}

// Opcionais e destaques
export interface CarReviewHighlight {
	text: string
	category?: 'performance' | 'design' | 'technology' | 'exclusivity' | 'comfort'
}

// Avaliação Attra
export interface CarReviewEvaluation {
	summary: string // 2-3 frases resumo
	highlights: string[] // 3-5 bullets
	target_profile?: string // Perfil do cliente ideal
	investment_potential?: 'alto' | 'medio' | 'estavel' // Potencial de valorização
}

// Imagem da galeria com legenda
export interface CarReviewGalleryImage {
	url: string
	alt: string
	caption?: string
}

export interface CarReviewFields {
	vehicle_id?: string
	brand: string
	model: string
	year: number
	version?: string // Ex: "LP640-2"
	status?: string // Ex: "0km", "Seminovo", "Exclusivo Attra"
	color?: string
	specs: CarReviewSpecs
	gallery_images: string[] | CarReviewGalleryImage[]
	availability: CarReviewAvailability
	// Novos campos para SEO/LLMO
	faq?: CarReviewFAQ[]
	highlights?: CarReviewHighlight[]
	optionals?: string[]
	evaluation?: CarReviewEvaluation
}

export interface BlogPostSEO {
	meta_title: string
	meta_description: string
	canonical_url?: string
	keywords: string[]
}

export interface DualBlogPost {
	id: string
	post_type: BlogPostType
	title: string
	slug: string
	excerpt: string
	content: string
	featured_image: string
	featured_image_alt: string
	author: BlogAuthor
	published_date: string
	updated_date?: string
	reading_time: string
	is_published: boolean

	// Type-specific fields
	educativo?: EducativoFields
	car_review?: CarReviewFields

	// SEO
	seo: BlogPostSEO
}

import { SITE_URL } from '@/lib/constants'
import { sitemapResponse, type SitemapUrl } from '@/lib/sitemap-utils'
import { SEO_BRANDS } from '@/lib/seo-brands'
import { MARCAS_EDITORIAL } from '@/lib/seo/marcas-editorial'
import { seNoAr } from '@/lib/seo/marcas-na-raiz'
import {
	MODELOS,
	PRECOS,
	CONDICOES,
	FAIXAS_PRECO,
	PERFIS_COMPRADOR,
	GUIAS_OPERACIONAIS,
	CONFIANCA_PAGES,
	IMPORTACAO_MARCAS,
} from '@/lib/seo'

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
	const lastmod = new Date().toISOString()
	const pages: SitemapUrl[] = [
		{ loc: BASE, lastmod, changefreq: 'daily', priority: 1.0 },
		{ loc: `${BASE}/veiculos`, lastmod, changefreq: 'hourly', priority: 0.9 },
		{ loc: `${BASE}/sobre`, lastmod, changefreq: 'monthly', priority: 0.7 },
		{ loc: `${BASE}/contato`, lastmod, changefreq: 'monthly', priority: 0.8 },
		{ loc: `${BASE}/financiamento`, lastmod, changefreq: 'monthly', priority: 0.8 },
		{ loc: `${BASE}/servicos/consignado`, lastmod, changefreq: 'monthly', priority: 0.7 },
		// Estavam indexadas e fora de todos os sitemaps (auditoria SEO/GEO 01/08/2026, P1.11).
		{ loc: `${BASE}/servicos/importacao`, lastmod, changefreq: 'monthly', priority: 0.7 },
		{ loc: `${BASE}/compramos-seu-carro`, lastmod, changefreq: 'monthly', priority: 0.7 },
		{ loc: `${BASE}/solicitar-veiculo`, lastmod, changefreq: 'monthly', priority: 0.6 },
		{ loc: `${BASE}/blog`, lastmod, changefreq: 'daily', priority: 0.8 },
		{ loc: `${BASE}/blog/arquivo`, lastmod, changefreq: 'daily', priority: 0.6 },
		{ loc: `${BASE}/videos`, lastmod, changefreq: 'daily', priority: 0.7 },
		// Índice de notícias: revalida a cada ciclo semanal de ingestão, daí o changefreq weekly.
		{ loc: `${BASE}/news`, lastmod, changefreq: 'weekly', priority: 0.6 },
		{ loc: `${BASE}/guia-supercarro-gratis`, lastmod, changefreq: 'monthly', priority: 0.6 },
		// Páginas de intenção criadas em 05/08/2026 para cobrir consultas em que a
		// Attra não era citada nas respostas de LLM. Prioridade alta porque são as
		// duas intenções que mais convertem no tráfego do site.
		{ loc: `${BASE}/onde-comprar-carros-de-luxo`, lastmod, changefreq: 'monthly', priority: 0.9 },
		{ loc: `${BASE}/carros-de-luxo-uberlandia`, lastmod, changefreq: 'monthly', priority: 0.9 },
		// Ativo de confiança: o que REPROVA um veículo. Sustenta a palavra
		// "procedência" que o site usa em todo anúncio.
		{ loc: `${BASE}/criterios-de-selecao`, lastmod, changefreq: 'monthly', priority: 0.9 },
		{ loc: `${BASE}/troca`, lastmod, changefreq: 'monthly', priority: 0.9 },
		{ loc: `${BASE}/jornada`, lastmod, changefreq: 'monthly', priority: 0.5 },
		{ loc: `${BASE}/glossario-automotivo`, lastmod, changefreq: 'weekly', priority: 0.5 },
		{ loc: `${BASE}/politica-privacidade`, lastmod, changefreq: 'yearly', priority: 0.3 },
		{ loc: `${BASE}/termos-uso`, lastmod, changefreq: 'yearly', priority: 0.3 },
		// SEO landing pages — brand/model hubs
		{ loc: `${BASE}/comprar`, lastmod, changefreq: 'daily', priority: 0.8 },
		...SEO_BRANDS.flatMap(brand => [
			// `as const` obrigatório: dentro do flatMap o literal alarga para
			// string e deixa de satisfazer SitemapUrl, o que contaminava a
			// inferência de TODOS os blocos seguintes do array.
			{ loc: `${BASE}/comprar/${brand.slug}`, lastmod, changefreq: 'daily' as const, priority: 0.8 },
			...brand.models.map(model => ({
				loc: `${BASE}/comprar/${brand.slug}/${model.slug}`,
				lastmod,
				changefreq: 'daily' as const,
				priority: 0.7,
			})),
		]),
		// Páginas editoriais de marca na raiz (/ferrari, /porsche…).
		//
		// Entram no sitemap SÓ AGORA, e a espera foi deliberada: enquanto elas
		// renderizavam o mesmo componente de /comprar/marca, submetê-las era pedir
		// indexação de uma cópia — o buscador escolheria uma das duas e descartaria
		// a outra. Com editorial próprio elas são páginas distintas, de intenção
		// informacional, e somam em vez de competir.
		//
		// A lista vem de MARCAS_EDITORIAL, não de SEO_BRANDS: só existe rota para
		// marca com texto escrito. changefreq menor que o da página comercial —
		// história de marca não muda toda semana; estoque muda.
		// `seNoAr`: fora do ar, o bloco some do sitemap. Anunciar URL que responde
		// 404 ensina o crawler que o domínio publica link morto.
		...seNoAr(Object.keys(MARCAS_EDITORIAL)).map(slug => ({
			loc: `${BASE}/${slug}`,
			lastmod,
			changefreq: 'weekly' as const,
			priority: 0.8,
		})),
		// Bloco 1 — Páginas de modelo
		...MODELOS.map(m => ({
			loc: `${BASE}/comprar/modelo/${m.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.7,
		})),
		// Bloco 2 — Páginas de preço
		...PRECOS.map(p => ({
			loc: `${BASE}/preco/${p.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.7,
		})),
		// Bloco 3 — Condição
		...CONDICOES.map(c => ({
			loc: `${BASE}/comprar/condicao/${c.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.6,
		})),
		// Bloco 4 — Faixa de preço
		...FAIXAS_PRECO.map(f => ({
			loc: `${BASE}/comprar/faixa-preco/${f.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.6,
		})),
		// Bloco 5 — Perfil do comprador
		...PERFIS_COMPRADOR.map(p => ({
			loc: `${BASE}/comprar/perfil/${p.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.6,
		})),
		// Bloco 6 — Guias operacionais
		...GUIAS_OPERACIONAIS.map(g => ({
			loc: `${BASE}/guia/${g.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.7,
		})),
		// Bloco 7 — Confiança
		...CONFIANCA_PAGES.map(c => ({
			loc: `${BASE}/${c.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.7,
		})),
		// Bloco 8 — Importação
		{ loc: `${BASE}/importacao-de-veiculos-de-luxo`, lastmod, changefreq: 'monthly', priority: 0.8 },
		...IMPORTACAO_MARCAS.map(m => ({
			loc: `${BASE}/importacao/${m.slug}`,
			lastmod,
			changefreq: 'monthly' as const,
			priority: 0.6,
		})),
	]

	return sitemapResponse(pages)
}

/**
 * Define capas para os posts do acervo que estão com default-cover ou sem
 * imagem (Fase -1 do canal editorial). Usa fotos institucionais reais já
 * presentes em public/ — nada de imagem genérica.
 *
 * Roda na VPS (precisa de DATABASE_URL no ambiente):
 *   npx tsx scripts/set-blog-covers.ts          # dry-run: só reporta
 *   npx tsx scripts/set-blog-covers.ts --apply  # grava no banco
 */
import fs from 'node:fs'
import path from 'node:path'
import { db } from '../src/lib/db'

// slugs confirmados contra sitemap-blog.xml em 2026-07-27
const COVERS: Record<string, { image: string; alt: string }> = {
	'a-compra-inteligente-de-um-supercarro-como-a-curadoria-criteriosa-protege-seu-investimento': {
		image: '/about/attra-colecao-supercarros-showroom.jpg',
		alt: 'Coleção de supercarros no showroom da Attra Veículos',
	},
	'decisao-patrimonial-ou-impulso-emocional-a-seguranca-na-compra-de-supercarros-acima-de-r-500-mil': {
		image: '/about/attra-showroom-moderno-2026.png',
		alt: 'Showroom moderno da Attra Veículos',
	},
	'o-guia-definitivo-da-attra-como-garantir-a-procedencia-e-a-seguranca-na-compra-do-seu-supercarro': {
		image: '/about/attra-showroom-iluminacao-noturna.jpg',
		alt: 'Showroom da Attra Veículos com iluminação noturna',
	},
	'superesportivo-ou-suv-de-luxo-a-decisao-inteligente-que-protege-seu-patrimonio': {
		image: '/experience/attra-estoque.jpg',
		alt: 'Estoque de veículos premium da Attra',
	},
	'o-padrao-attra-por-que-a-procedencia-e-o-ativo-mais-valioso-do-seu-supercarro': {
		image: '/about/attra-primeiro-superesportivo.jpg',
		alt: 'Primeiro superesportivo da história da Attra Veículos',
	},
	'o-mito-da-baixa-quilometragem-por-que-a-inatividade-e-mais-destrutiva-para-seu-supercarro-do-que-o-uso-consciente': {
		image: '/experience/attra-rondon.jpg',
		alt: 'Veículo da Attra em uso na estrada',
	},
	'o-risco-oculto-dos-supercarros-por-que-a-procedencia-e-mais-valiosa-que-a-garantia': {
		image: '/experience/attra-lambo.jpg',
		alt: 'Lamborghini no acervo da Attra Veículos',
	},
	'por-que-os-superesportivos-sao-investimentos-inteligentes-em-2026-4br7xj': {
		image: '/about/attra-acervo-veiculos-premium.jpg',
		alt: 'Acervo de veículos premium da Attra Veículos',
	},
}

async function main() {
	const apply = process.argv.includes('--apply')
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL ausente — rode este script na VPS.')
		process.exit(1)
	}

	for (const [slug, cover] of Object.entries(COVERS)) {
		const localPath = path.join(process.cwd(), 'public', cover.image)
		if (!fs.existsSync(localPath)) {
			console.error(`ARQUIVO NÃO EXISTE: public${cover.image} (slug ${slug}) — corrigir mapeamento.`)
			process.exitCode = 1
			continue
		}
		const row = await db.selectFrom('dual_blog_posts')
			.select(['id', 'featured_image'])
			.where('slug', '=', slug)
			.executeTakeFirst()
		if (!row) {
			console.warn(`slug não encontrado no banco: ${slug}`)
			continue
		}
		const current = String(row.featured_image || '')
		// Só preenche capa ausente/placeholder — nunca sobrescreve capa
		// definida depois (ex.: via admin)
		if (current && !current.includes('default-cover')) {
			console.log(`pulado (já tem capa própria): ${slug} -> ${current}`)
			continue
		}
		console.log(`${apply ? 'APLICANDO' : 'dry-run'}: ${slug} -> ${cover.image} (antes: ${current || '(vazio)'})`)
		if (apply) {
			await db.updateTable('dual_blog_posts')
				.set({ featured_image: cover.image, featured_image_alt: cover.alt })
				.where('id', '=', row.id)
				.execute()
		}
	}
}

main()
	.catch((err) => {
		console.error(err)
		process.exitCode = 1
	})
	.finally(() => db.destroy().catch(() => {}))

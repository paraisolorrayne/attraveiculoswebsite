import { NextResponse } from 'next/server'

/**
 * GET /indexnow/{chave}.txt — prova de posse do host para o IndexNow.
 *
 * O protocolo exige que a chave enviada no POST exista como arquivo de texto
 * no próprio domínio (ver `keyLocation` em src/lib/indexnow.ts). Servida por
 * rota, e não por arquivo em public/, para a chave viver só na env
 * (INDEXNOW_KEY) — trocar a chave é trocar a env, sem commit.
 *
 * Fica fora de /api/ de propósito: robots.txt bloqueia /api/ e o Bing precisa
 * buscar este arquivo.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ arquivo: string }> }) {
	const { arquivo } = await params
	const chave = process.env.INDEXNOW_KEY
	if (!chave || arquivo !== `${chave}.txt`) {
		return new NextResponse('Not found', { status: 404 })
	}
	return new NextResponse(chave, {
		status: 200,
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
	})
}

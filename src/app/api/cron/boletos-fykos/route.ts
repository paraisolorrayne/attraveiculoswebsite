import { NextRequest, NextResponse } from 'next/server'
import { configuracaoBoletosFykos, entregarBoletosAoFykos } from '@/lib/boletos-fykos'
import { safeEquals } from '@/lib/crm-webhook'

export const dynamic = 'force-dynamic'

// POST — o cron (a cada minuto) tenta de novo os avisos de boleto que o Fykos ainda não aceitou.
export async function POST(request: NextRequest) {
	const secret = process.env.CRON_SECRET
	if (!secret || !safeEquals(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}
	if (!configuracaoBoletosFykos()) return NextResponse.json({ error: 'Integração não configurada.' }, { status: 503 })
	try {
		return NextResponse.json({ entregues: await entregarBoletosAoFykos(50) })
	} catch {
		return NextResponse.json({ error: 'Falha ao entregar os avisos.' }, { status: 500 })
	}
}

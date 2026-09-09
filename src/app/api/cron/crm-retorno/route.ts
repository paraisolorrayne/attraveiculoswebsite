import { NextRequest, NextResponse } from 'next/server'
import { safeEquals } from '@/lib/crm-webhook'
import { configuracaoRetornoCrm, entregarRetornosCrm } from '@/lib/crm-retorno'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
	const secret = process.env.CRON_SECRET
	if (!secret || !safeEquals(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}
	if (!configuracaoRetornoCrm()) return NextResponse.json({ error: 'Retorno não configurado.' }, { status: 503 })
	try {
		return NextResponse.json({ entregues: await entregarRetornosCrm() })
	} catch {
		return NextResponse.json({ error: 'Falha ao processar retornos.' }, { status: 500 })
	}
}

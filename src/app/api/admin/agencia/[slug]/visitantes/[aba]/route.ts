import { NextRequest, NextResponse } from 'next/server'
import { acessoAgencia } from '@/lib/auth/guard-agencia'
import { escopoDaUrl } from '@/lib/visitors/escopo-da-url'
import type { Escopo } from '@/lib/visitors/escopo'
import { consultarResumoAgencia } from '@/lib/visitors/consultas/resumo-agencia'
import { consultarMetrics } from '@/lib/visitors/consultas/metrics'
import { consultarOrigens } from '@/lib/visitors/consultas/origens'
import { consultarEntradas } from '@/lib/visitors/consultas/entradas'
import { consultarSessoes } from '@/lib/visitors/consultas/sessoes'
import { consultarJornadas } from '@/lib/visitors/consultas/jornadas'
import { consultarSessaoDetalhe } from '@/lib/visitors/consultas/sessao-detalhe'
import { consultarComportamento } from '@/lib/visitors/consultas/comportamento'
import { consultarVeiculos } from '@/lib/visitors/consultas/veiculos'
import { consultarTermos } from '@/lib/visitors/consultas/termos'
import { consultarCampanha } from '@/lib/visitors/consultas/campanha'
import { consultarCampanhas } from '@/lib/visitors/consultas/campanhas'
import { consultarCampanhasOpcoes } from '@/lib/visitors/consultas/campanhas-opcoes'
import { consultarLeadsAgencia } from '@/lib/visitors/consultas/leads-agencia'

/**
 * Visitantes da agência. A agência vem do LOGIN (via acessoAgencia): para
 * usuário `agencia`, um slug que não é o dele é 403. Os filtros de
 * plataforma/campanha só estreitam dentro das visitas com o marcador dela.
 *
 * Fora daqui de propósito: perfis identificados (nome/e-mail/telefone) e
 * receita em R$ — não há aba para eles. Os leads (`leads`) saem sem nome,
 * telefone, vendedor nem valor.
 */
const ABAS: Record<string, (url: string, escopo: Escopo) => Promise<unknown>> = {
	resumo: consultarResumoAgencia,
	metrics: consultarMetrics,
	origens: consultarOrigens,
	entradas: consultarEntradas,
	sessoes: consultarSessoes,
	jornadas: consultarJornadas,
	sessao: consultarSessaoDetalhe,
	comportamento: consultarComportamento,
	veiculos: consultarVeiculos,
	termos: consultarTermos,
	campanha: consultarCampanha,
	campanhas: consultarCampanhas,
	'campanhas-opcoes': consultarCampanhasOpcoes,
	leads: consultarLeadsAgencia,
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; aba: string }> }) {
	const { slug, aba } = await params
	const consultar = ABAS[aba]
	if (!consultar) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	const acesso = await acessoAgencia(slug)
	if (!acesso.ok) return NextResponse.json({ error: 'Forbidden' }, { status: acesso.status })
	try {
		const r = await consultar(request.url, escopoDaUrl(request.url, acesso.agencia.id))
		if (r && typeof r === 'object' && 'erro' in r) {
			const e = r as { erro: number; mensagem?: string }
			return NextResponse.json({ error: e.mensagem ?? 'Erro' }, { status: e.erro })
		}
		return NextResponse.json(r)
	} catch (error) {
		console.error(`[Agencia Visitantes API] ${aba}:`, error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

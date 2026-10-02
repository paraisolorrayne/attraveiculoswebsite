'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useVisitantesApi } from '@/app/admin/visitors/visitantes-api'
import { VisitorsDashboard } from '@/app/admin/visitors/visitors-dashboard'
import { OrigensPainel } from '@/app/admin/visitors/origens/origens-painel'
import { EntradasPainel } from '@/app/admin/visitors/entradas/entradas-painel'
import { SessoesPainel } from '@/app/admin/visitors/sessoes/sessoes-painel'
import { ComportamentoPainel } from '@/app/admin/visitors/comportamento/comportamento-painel'
import { VeiculosPainel } from '@/app/admin/visitors/veiculos/veiculos-painel'
import { ABAS_VISITANTES } from './abas'


/**
 * As mesmas seis abas do painel de Visitantes, filtradas para as campanhas da
 * agência (o contexto do shell aponta as chamadas para a API dela). Abaixo de
 * `md` as abas viram um seletor, para não haver faixa rolando para o lado.
 */
export function AbasVisitantes({ aba }: { aba: string }) {
	const { link } = useVisitantesApi()
	const router = useRouter()
	const href = (a: string) => link(a === 'visao-geral' ? '' : `/${a}`)

	return (
		<div className="space-y-4">
			<nav className="hidden md:flex flex-wrap gap-1 border-b border-border" aria-label="Seções de visitantes">
				{ABAS_VISITANTES.map(a => (
					<Link
						key={a.aba}
						href={href(a.aba)}
						className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
							a.aba === aba ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary hover:text-foreground'
						}`}
					>
						{a.rotulo}
					</Link>
				))}
			</nav>
			<select
				className="md:hidden w-full rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground"
				value={aba}
				onChange={e => router.push(href(e.target.value))}
				aria-label="Seção de visitantes"
			>
				{ABAS_VISITANTES.map(a => (
					<option key={a.aba} value={a.aba}>
						{a.rotulo}
					</option>
				))}
			</select>

			{aba === 'visao-geral' && <VisitorsDashboard adminId="" />}
			{aba === 'origens' && <OrigensPainel />}
			{aba === 'entradas' && <EntradasPainel />}
			{aba === 'sessoes' && <SessoesPainel />}
			{aba === 'comportamento' && <ComportamentoPainel />}
			{aba === 'veiculos' && <VeiculosPainel />}
		</div>
	)
}

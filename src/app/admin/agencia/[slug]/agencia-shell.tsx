'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LarguraTotalProvider } from '@/app/admin/visitors/largura-total'
import { VisitantesApiProvider, comParams, type VisitantesApi } from '@/app/admin/visitors/visitantes-api'
import { SeletorPeriodo } from '@/app/admin/visitors/visitors-ui'
import { comFiltros, linkDaAgencia } from '@/lib/agencias/links'

const PLATAFORMAS = [
	{ valor: '', rotulo: 'Todas' },
	{ valor: 'google', rotulo: 'Google' },
	{ valor: 'meta', rotulo: 'Meta' },
	{ valor: 'webmotors', rotulo: 'WebMotors' },
] as const

/**
 * Moldura da área da agência: ocupa a tela inteira (sem largura máxima) e
 * nunca rola para o lado. Período, plataforma e campanha ficam no topo, na
 * URL, e valem para todas as abas — o link copiado abre com os mesmos filtros.
 */
export function AgenciaShell({
	agencia,
	ehAttra,
	agencias,
	children,
}: {
	agencia: { id: string; slug: string; nome: string }
	ehAttra: boolean
	agencias: { slug: string; nome: string }[]
	children: ReactNode
}) {
	const router = useRouter()
	const pathname = usePathname()
	const params = useSearchParams()
	const dias = Number(params.get('dias')) || 30
	const plataforma = params.get('plataforma') ?? ''
	const campanha = params.get('campanha') ?? ''

	const definir = useCallback(
		(mudanca: Record<string, string | number | undefined>) => {
			const q = new URLSearchParams(params.toString())
			for (const [k, v] of Object.entries(mudanca)) {
				if (v === undefined || v === '' || (k === 'dias' && v === 30)) q.delete(k)
				else q.set(k, String(v))
			}
			const s = q.toString()
			router.replace(s ? `${pathname}?${s}` : pathname)
		},
		[params, pathname, router],
	)

	const filtros = useMemo(() => ({ dias: dias === 30 ? undefined : String(dias), plataforma, campanha }), [dias, plataforma, campanha])

	const api = useMemo<VisitantesApi>(
		() => ({
			api: (aba, p) => comParams(`/api/admin/agencia/${agencia.slug}/visitantes/${aba}`, { ...p, plataforma, campanha }),
			link: caminho => comFiltros(linkDaAgencia(agencia.slug, caminho), filtros),
			modo: 'agencia',
			periodo: { dias, setDias: d => definir({ dias: d }) },
		}),
		[agencia.slug, plataforma, campanha, filtros, dias, definir],
	)

	const base = `/admin/agencia/${agencia.slug}`
	const abas = [
		{ href: base, rotulo: 'Resumo', ativa: pathname === base },
		{ href: `${base}/leads`, rotulo: 'Leads', ativa: pathname.startsWith(`${base}/leads`) },
		{ href: `${base}/visitantes/visao-geral`, rotulo: 'Visitantes', ativa: pathname.startsWith(`${base}/visitantes`) || pathname.startsWith(`${base}/sessoes`) || pathname.startsWith(`${base}/campanha/`) },
	]

	return (
		<div className="w-full px-4 md:px-6 2xl:px-10 pb-10">
			<div className="sticky top-0 z-30 -mx-4 md:-mx-6 2xl:-mx-10 px-4 md:px-6 2xl:px-10 pt-4 pb-3 bg-background/95 backdrop-blur border-b border-border space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-[11px] uppercase tracking-wide text-foreground-secondary">Marketing</p>
						<h1 className="text-xl font-semibold text-foreground truncate">{agencia.nome}</h1>
					</div>
					{ehAttra && agencias.length > 1 && (
						<select
							value={agencia.slug}
							onChange={e => router.push(pathname.replace(base, `/admin/agencia/${e.target.value}`))}
							className="rounded-lg border border-border bg-background-card px-2 py-1.5 text-sm text-foreground"
							aria-label="Agência"
						>
							{agencias.map(a => (
								<option key={a.slug} value={a.slug}>
									{a.nome}
								</option>
							))}
						</select>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SeletorPeriodo dias={dias} onChange={d => definir({ dias: d })} />
					<div className="flex flex-wrap gap-1" role="group" aria-label="Plataforma">
						{PLATAFORMAS.map(p => (
							<button
								key={p.valor}
								type="button"
								onClick={() => definir({ plataforma: p.valor, campanha: undefined })}
								className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
									plataforma === p.valor ? 'border-primary text-primary' : 'border-border text-foreground-secondary hover:text-foreground'
								}`}
							>
								{p.rotulo}
							</button>
						))}
					</div>
					<FiltroCampanha slug={agencia.slug} dias={dias} plataforma={plataforma} valor={campanha} onChange={c => definir({ campanha: c })} />
				</div>
				<nav className="flex gap-1" aria-label="Seções da agência">
					{abas.map(a => (
						<Link
							key={a.href}
							href={comFiltros(a.href, filtros)}
							className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
								a.ativa ? 'bg-primary/10 text-primary' : 'text-foreground-secondary hover:text-foreground'
							}`}
						>
							{a.rotulo}
						</Link>
					))}
				</nav>
			</div>
			<div className="pt-4">
				<LarguraTotalProvider>
					<VisitantesApiProvider valor={api}>{children}</VisitantesApiProvider>
				</LarguraTotalProvider>
			</div>
		</div>
	)
}

/**
 * Uma campanha (ou todas) entre as que trouxeram visitas da agência no período,
 * na plataforma escolhida — o mesmo rótulo das tabelas ("campanha #<id>" quando
 * o nome vem vazio). A escolhida continua na lista mesmo se sumir do período.
 */
function FiltroCampanha({
	slug,
	dias,
	plataforma,
	valor,
	onChange,
}: {
	slug: string
	dias: number
	plataforma: string
	valor: string
	onChange: (v: string) => void
}) {
	const [lista, setLista] = useState<{ nome: string; sessoes: number }[]>([])
	useEffect(() => {
		let vivo = true
		fetch(comParams(`/api/admin/agencia/${slug}/visitantes/campanhas-opcoes`, { dias, plataforma }))
			.then(r => (r.ok ? r.json() : { campanhas: [] }))
			.then(j => vivo && setLista(j.campanhas ?? []))
			.catch(() => vivo && setLista([]))
		return () => {
			vivo = false
		}
	}, [slug, dias, plataforma])
	const opcoes = valor && !lista.some(c => c.nome === valor) ? [{ nome: valor, sessoes: 0 }, ...lista] : lista
	if (opcoes.length === 0) return null
	return (
		<select
			value={valor}
			onChange={e => onChange(e.target.value)}
			className="min-w-0 max-w-full flex-1 sm:flex-none sm:max-w-xs rounded-lg border border-border bg-background-card px-2 py-1 text-xs text-foreground"
			aria-label="Campanha"
		>
			<option value="">Todas as campanhas</option>
			{opcoes.map(c => (
				<option key={c.nome} value={c.nome}>
					{c.sessoes > 0 ? `${c.nome} · ${c.sessoes.toLocaleString('pt-BR')}` : c.nome}
				</option>
			))}
		</select>
	)
}

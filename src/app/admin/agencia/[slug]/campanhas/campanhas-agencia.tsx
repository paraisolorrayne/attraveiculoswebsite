'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useVisitantesApi } from '@/app/admin/visitors/visitantes-api'
import { TabelaOrdenavel, type ColunaTabela } from '@/app/admin/visitors/visitors-tabela'
import { Secao } from '@/app/admin/visitors/visitors-tabelas'
import { Badge, Erro, Vazio } from '@/app/admin/visitors/visitors-ui'
import { fmtNum } from '@/app/admin/visitors/visitors-metrics'

interface Campanha {
	id: string
	plataforma: 'google' | 'meta' | 'webmotors'
	nome: string
	id_externo: string | null
	destino: 'site' | 'whatsapp'
	mensagem_prefixo: string | null
	inicio: string
	fim: string | null
	visitas_periodo: number
	situacao: 'ativa' | 'agendada' | 'encerrada'
}

interface Detectada {
	plataforma: string | null
	utm_campaign: string | null
	utm_id: string | null
	sessoes: number
}

interface Formulario {
	id?: string
	plataforma: string
	nome: string
	id_externo: string
	destino: 'site' | 'whatsapp'
	mensagem_prefixo: string
	inicio: string
	fim: string
}

const ROTULO_PLATAFORMA: Record<string, string> = { google: 'Google', meta: 'Meta', webmotors: 'WebMotors' }
const COR_SITUACAO: Record<Campanha['situacao'], string> = {
	ativa: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
	agendada: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
	encerrada: 'bg-foreground/10 text-foreground-secondary',
}

function dataBR(d: string | null): string {
	if (!d) return ''
	const [a, m, dia] = d.split('-')
	return `${dia}/${m}/${a.slice(2)}`
}

const vazio = (hoje: string): Formulario => ({
	plataforma: '',
	nome: '',
	id_externo: '',
	destino: 'site',
	mensagem_prefixo: '',
	inicio: hoje,
	fim: '',
})

/**
 * Cadastro das campanhas da agência. Vale na hora: a campanha passa a contar
 * no Resumo e em Visitantes assim que é salva. A conferência fica na coluna
 * "visitas no período" — campanha ativa sem visita é ID ou nome errado.
 */
export function CampanhasAgencia({ slug }: { slug: string }) {
	const { periodo } = useVisitantesApi()
	const dias = periodo?.dias ?? 30
	const [campanhas, setCampanhas] = useState<Campanha[] | null>(null)
	const [hoje, setHoje] = useState('')
	const [detectadas, setDetectadas] = useState<Detectada[]>([])
	const [erro, setErro] = useState<string | null>(null)
	const [form, setForm] = useState<Formulario | null>(null)
	const [encerrando, setEncerrando] = useState<string | null>(null)

	const carregar = useCallback(async () => {
		setErro(null)
		try {
			const [c, d] = await Promise.all([
				fetch(`/api/admin/agencia/${slug}/campanhas?dias=${dias}`),
				fetch(`/api/admin/agencia/${slug}/campanhas/detectadas`),
			])
			if (!c.ok) throw new Error(`HTTP ${c.status}`)
			const jc = await c.json()
			setCampanhas(jc.campanhas)
			setHoje(jc.hoje)
			setDetectadas(d.ok ? (await d.json()).detectadas : [])
		} catch (e) {
			console.error('[Campanhas agência] falha ao carregar:', e)
			setErro('Não foi possível carregar as campanhas.')
		}
	}, [slug, dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	const encerrar = async (id: string) => {
		const r = await fetch(`/api/admin/agencia/${slug}/campanhas/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ encerrar: true }),
		})
		setEncerrando(null)
		if (!r.ok) setErro((await r.json().catch(() => ({}))).error ?? 'Não foi possível encerrar.')
		await carregar()
	}

	const colunas: ColunaTabela<Campanha>[] = [
		{
			chave: 'nome',
			titulo: 'Campanha',
			filtro: 'texto',
			valor: c => c.nome,
			prioridade: 1,
			render: c => <span className="font-medium break-words">{c.nome}</span>,
		},
		{
			chave: 'plataforma',
			titulo: 'Plataforma',
			filtro: 'opcoes',
			valor: c => ROTULO_PLATAFORMA[c.plataforma],
			prioridade: 1,
			render: c => ROTULO_PLATAFORMA[c.plataforma],
		},
		{
			chave: 'situacao',
			titulo: 'Situação',
			filtro: 'opcoes',
			valor: c => c.situacao,
			prioridade: 1,
			render: c => <Badge cor={COR_SITUACAO[c.situacao]}>{c.situacao}</Badge>,
		},
		{
			chave: 'visitas',
			titulo: 'Visitas no período',
			filtro: 'numero',
			valor: c => c.visitas_periodo,
			alinhar: 'dir',
			prioridade: 1,
			render: c =>
				c.situacao === 'ativa' && c.visitas_periodo === 0 ? (
					<span className="text-amber-600 dark:text-amber-400" title="Campanha ativa sem nenhuma visita: confira o ID e o nome">
						0 · confira o ID
					</span>
				) : (
					<span className="tabular-nums">{fmtNum(c.visitas_periodo)}</span>
				),
		},
		{
			chave: 'id_externo',
			titulo: 'ID',
			valor: c => c.id_externo ?? '',
			prioridade: 2,
			render: c => <span className="font-mono text-xs break-all">{c.id_externo ?? '—'}</span>,
		},
		{
			chave: 'destino',
			titulo: 'Destino',
			filtro: 'opcoes',
			valor: c => (c.destino === 'whatsapp' ? 'WhatsApp direto' : 'Site'),
			prioridade: 2,
			render: c => (c.destino === 'whatsapp' ? 'WhatsApp direto' : 'Site'),
		},
		{
			chave: 'periodo',
			titulo: 'Período',
			valor: c => c.inicio,
			prioridade: 3,
			render: c => `${dataBR(c.inicio)}${c.fim ? ` – ${dataBR(c.fim)}` : ' – em andamento'}`,
		},
		{
			chave: 'acoes',
			titulo: 'Ações',
			prioridade: 2,
			render: c => (
				<div className="flex flex-wrap gap-2 text-xs">
					<button
						type="button"
						className="text-primary hover:underline"
						onClick={() =>
							setForm({
								id: c.id,
								plataforma: c.plataforma,
								nome: c.nome,
								id_externo: c.id_externo ?? '',
								destino: c.destino,
								mensagem_prefixo: c.mensagem_prefixo ?? '',
								inicio: c.inicio,
								fim: c.fim ?? '',
							})
						}
					>
						editar
					</button>
					{c.situacao !== 'encerrada' &&
						(encerrando === c.id ? (
							<button type="button" className="text-red-600 hover:underline" onClick={() => encerrar(c.id)}>
								confirmar encerramento
							</button>
						) : (
							<button type="button" className="text-foreground-secondary hover:text-foreground" onClick={() => setEncerrando(c.id)}>
								encerrar
							</button>
						))}
				</div>
			),
		},
	]

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="max-w-2xl text-sm text-foreground-secondary">
					Cadastre aqui as campanhas que estão rodando. Elas passam a contar no Resumo e em Visitantes assim que
					forem salvas.
				</p>
				<button
					type="button"
					onClick={() => setForm(vazio(hoje))}
					className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
				>
					<Plus className="w-4 h-4" /> Nova campanha
				</button>
			</div>

			{erro && <Erro>{erro}</Erro>}

			<Secao
				titulo="Campanhas cadastradas"
				dica="Uma visita conta para a campanha quando o ID dela (utm_id) ou o nome (utm_campaign) bate com o cadastro, na mesma plataforma. Encerrar não apaga: a campanha continua no histórico."
			>
				{campanhas === null ? (
					<p className="px-4 py-8 text-center text-sm text-foreground-secondary">Carregando…</p>
				) : (
					<TabelaOrdenavel colunas={colunas} linhas={campanhas} chaveLinha={c => c.id} vazio="Nenhuma campanha cadastrada ainda." />
				)}
			</Secao>

			<Secao
				titulo="Detectadas sem cadastro"
				dica="Visitas dos últimos 30 dias com a marca da agência (o prefixo no nome da campanha ou o utm_medium dela) que ainda não batem com nenhuma campanha cadastrada. Cadastre para que entrem nos números."
			>
				{detectadas.length === 0 ? (
					<Vazio>Nenhuma visita com a sua marca fora do cadastro.</Vazio>
				) : (
					<ul className="divide-y divide-border">
						{detectadas.map((d, i) => (
							<li key={i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
								<div className="min-w-0">
									<p className="text-sm font-medium text-foreground break-words">{d.utm_campaign ?? '(sem nome)'}</p>
									<p className="text-xs text-foreground-secondary break-words">
										{d.plataforma ? ROTULO_PLATAFORMA[d.plataforma] : 'Plataforma não identificada'}
										{d.utm_id && <> · ID {d.utm_id}</>} · {fmtNum(d.sessoes)} visitas
									</p>
								</div>
								<button
									type="button"
									className="text-sm text-primary hover:underline"
									onClick={() =>
										setForm({
											...vazio(hoje),
											plataforma: d.plataforma ?? '',
											nome: d.utm_campaign ?? '',
											id_externo: d.utm_id ?? '',
										})
									}
								>
									cadastrar
								</button>
							</li>
						))}
					</ul>
				)}
			</Secao>

			{form && <PainelCampanha slug={slug} inicial={form} onFechar={() => setForm(null)} onSalvo={carregar} />}
		</div>
	)
}

/** Formulário em painel lateral (tela cheia no celular). Os erros da API aparecem no topo. */
function PainelCampanha({
	slug,
	inicial,
	onFechar,
	onSalvo,
}: {
	slug: string
	inicial: Formulario
	onFechar: () => void
	onSalvo: () => Promise<void>
}) {
	const [f, setF] = useState(inicial)
	const [erro, setErro] = useState<string | null>(null)
	const [salvando, setSalvando] = useState(false)
	const muda = (patch: Partial<Formulario>) => setF(atual => ({ ...atual, ...patch }))

	const salvar = async (e: React.FormEvent) => {
		e.preventDefault()
		setSalvando(true)
		setErro(null)
		const corpo = {
			plataforma: f.plataforma,
			nome: f.nome,
			id_externo: f.id_externo,
			destino: f.destino,
			mensagem_prefixo: f.destino === 'whatsapp' ? f.mensagem_prefixo : '',
			inicio: f.inicio,
			fim: f.fim,
		}
		const r = await fetch(f.id ? `/api/admin/agencia/${slug}/campanhas/${f.id}` : `/api/admin/agencia/${slug}/campanhas`, {
			method: f.id ? 'PATCH' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(corpo),
		})
		setSalvando(false)
		if (!r.ok) {
			setErro((await r.json().catch(() => ({}))).error ?? `Não foi possível salvar (HTTP ${r.status}).`)
			return
		}
		await onSalvo()
		onFechar()
	}

	const campo = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground'
	const rotulo = 'block text-xs font-medium text-foreground-secondary mb-1'

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onFechar}>
			<form
				onSubmit={salvar}
				onClick={e => e.stopPropagation()}
				className="h-full w-full md:w-[28rem] overflow-y-auto bg-background-card border-l border-border p-5 space-y-4"
			>
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-foreground">{f.id ? 'Editar campanha' : 'Nova campanha'}</h2>
					<button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 text-foreground-secondary hover:text-foreground">
						<X className="w-5 h-5" />
					</button>
				</div>

				{erro && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{erro}</p>}

				<div>
					<span className={rotulo}>Plataforma</span>
					<div className="grid grid-cols-3 gap-2">
						{(['google', 'meta', 'webmotors'] as const).map(p => (
							<button
								key={p}
								type="button"
								onClick={() => muda({ plataforma: p })}
								className={`rounded-lg border px-2 py-2 text-sm ${f.plataforma === p ? 'border-primary text-primary' : 'border-border text-foreground-secondary'}`}
							>
								{ROTULO_PLATAFORMA[p]}
							</button>
						))}
					</div>
				</div>

				<div>
					<label className={rotulo} htmlFor="camp-nome">Nome da campanha</label>
					<input id="camp-nome" required value={f.nome} onChange={e => muda({ nome: e.target.value })} className={campo} placeholder="va-pmax-nucleo-out26" />
				</div>

				<div>
					<label className={rotulo} htmlFor="camp-id">ID da campanha</label>
					<input id="camp-id" value={f.id_externo} onChange={e => muda({ id_externo: e.target.value })} className={`${campo} font-mono`} inputMode="numeric" />
					<p className="mt-1 text-xs text-foreground-secondary">
						O número que aparece no gerenciador da plataforma (e no <code>utm_id</code> das visitas). Com ele, as visitas que
						chegam sem o nome da campanha também contam.
					</p>
				</div>

				<div>
					<span className={rotulo}>Para onde o anúncio leva</span>
					<div className="grid grid-cols-2 gap-2">
						{(['site', 'whatsapp'] as const).map(d => (
							<button
								key={d}
								type="button"
								onClick={() => muda({ destino: d })}
								className={`rounded-lg border px-2 py-2 text-sm ${f.destino === d ? 'border-primary text-primary' : 'border-border text-foreground-secondary'}`}
							>
								{d === 'site' ? 'Site' : 'WhatsApp direto'}
							</button>
						))}
					</div>
				</div>

				{f.destino === 'whatsapp' && (
					<div>
						<label className={rotulo} htmlFor="camp-msg">Mensagem pré-preenchida do anúncio</label>
						<input id="camp-msg" value={f.mensagem_prefixo} onChange={e => muda({ mensagem_prefixo: e.target.value })} className={campo} placeholder="Vi no Instagram o" />
						<p className="mt-1 text-xs text-foreground-secondary">O começo da mensagem que o anúncio deixa pronta. É por ela que o lead é reconhecido.</p>
					</div>
				)}

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className={rotulo} htmlFor="camp-inicio">Início</label>
						<input id="camp-inicio" type="date" required value={f.inicio} onChange={e => muda({ inicio: e.target.value })} className={campo} />
					</div>
					<div>
						<label className={rotulo} htmlFor="camp-fim">Fim (opcional)</label>
						<input id="camp-fim" type="date" value={f.fim} onChange={e => muda({ fim: e.target.value })} className={campo} />
					</div>
				</div>

				<button type="submit" disabled={salvando} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
					{salvando ? 'Salvando…' : 'Salvar campanha'}
				</button>
			</form>
		</div>
	)
}

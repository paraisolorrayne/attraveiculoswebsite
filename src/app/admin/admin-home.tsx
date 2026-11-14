/**
 * A tela inicial do admin: só o desenho.
 *
 * Separada da página porque a página faz autenticação e consultas, e nada
 * disso roda fora de um servidor com banco. Aqui entram dados prontos e sai a
 * tela.
 *
 * Desde 14/11/2026 ela se monta pelo perfil (src/lib/admin-inicio.ts): cada
 * pessoa vê primeiro o que precisa dela, depois como as coisas estão, e os
 * atalhos por último. O menu das seções saiu daqui para a barra lateral.
 */
import Link from 'next/link'
import { AlertTriangle, ArrowRight, ArrowUpRight, Check, Clock } from 'lucide-react'
import { GRUPOS, type AdminSection } from '@/lib/admin-sections'
import type { Indicador, ResumoAdmin } from '@/lib/admin-resumo'
import { DIAS_DE_CARRO_NOVO, type DadosDoInicio } from '@/lib/admin-inicio'
import { CarrosSemCriativo } from './carros-sem-criativo'
import { SaldoMeta } from '@/components/admin/saldo-meta'

const LARGURA = 'w-full px-4 sm:px-6 lg:px-10'

export function saudacao(hora: number): string {
	if (hora < 12) return 'Bom dia'
	if (hora < 18) return 'Boa tarde'
	return 'Boa noite'
}

const numero = (n: number) => n.toLocaleString('pt-BR')
const real = (n: number) =>
	n >= 1_000_000
		? `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
		: n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/* ------------------------------------------------------------- peças */

function Bloco({
	titulo,
	nota,
	link,
	children,
}: {
	titulo: string
	nota?: string
	link?: { rotulo: string; href: string }
	children: React.ReactNode
}) {
	return (
		<section className="mt-10">
			<div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<div className="flex flex-wrap items-baseline gap-x-3">
					<h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
					{nota && <span className="text-sm text-foreground-secondary">{nota}</span>}
				</div>
				{link && (
					<Link href={link.href} className="flex min-h-10 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline">
						{link.rotulo}
						<ArrowRight className="h-4 w-4" />
					</Link>
				)}
			</div>
			{children}
		</section>
	)
}

function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`rounded-xl border border-border bg-background-card p-5 ${className}`}>{children}</div>
}

/** Número grande com rótulo embaixo e, se houver, a comparação. */
function Medida({ valor, rotulo, comparacao }: { valor: string; rotulo: string; comparacao?: string }) {
	return (
		<div className="min-w-0 flex-1">
			<div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{valor}</div>
			<div className="mt-1 text-sm text-foreground-secondary">{rotulo}</div>
			{comparacao && <div className="mt-0.5 text-xs text-foreground-secondary">{comparacao}</div>}
		</div>
	)
}

function NaoCarregou({ oQue }: { oQue: string }) {
	return (
		<Cartao className="flex items-center gap-3 text-sm text-foreground-secondary">
			<AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
			Não foi possível carregar {oQue} agora. Recarregue a página em instantes.
		</Cartao>
	)
}

function Tudo({ texto }: { texto: string }) {
	return (
		<Cartao className="flex items-center gap-2 text-foreground">
			<Check className="h-5 w-5 shrink-0 text-green-600" />
			{texto}
		</Cartao>
	)
}

const COR_DO_ATRASO = { ok: 'text-foreground-secondary', atencao: 'text-amber-600 dark:text-amber-400', critico: 'text-red-600 dark:text-red-400' } as const

/* ------------------------------------------------------------- blocos */

function BlocoCarros({ dados }: { dados: DadosDoInicio['carros'] }) {
	if (!dados) return <Bloco titulo="Carros sem criativo"><NaoCarregou oQue="o estoque" /></Bloco>
	const resto = dados.total - dados.carros.length
	return (
		<Bloco
			titulo="Carros sem criativo"
			nota={
				dados.total === 0
					? undefined
					: `${numero(dados.total)} de ${numero(dados.novos)} carros que entraram nos últimos ${DIAS_DE_CARRO_NOVO} dias${resto > 0 ? `, os ${dados.carros.length} mais novos abaixo` : ''}`
			}
			link={{ rotulo: 'Abrir o gerador', href: '/admin/gerador-criativos' }}
		>
			<CarrosSemCriativo carros={dados.carros} />
		</Bloco>
	)
}

function BlocoComercial({ dados }: { dados: DadosDoInicio['comercial'] }) {
	if (!dados) return <Bloco titulo="Comercial"><NaoCarregou oQue="os leads" /></Bloco>
	const { aguardando, mes, mesAnterior, funil } = dados
	return (
		<>
			<Bloco
				titulo="Leads aguardando aceite"
				nota={
					aguardando.total === 0
						? undefined
						: `${numero(aguardando.total)} na fila${aguardando.criticos > 0 ? `, ${numero(aguardando.criticos)} há mais de 4 horas` : ''}`
				}
				link={{ rotulo: 'Abrir o CRM', href: '/admin/crm' }}
			>
				{aguardando.total === 0 ? (
					<Tudo texto="Nenhum lead esperando aceite." />
				) : (
					<Cartao className="p-0">
						<ul className="divide-y divide-border">
							{aguardando.leads.map(l => (
								<li key={l.id}>
									<Link href={`/admin/crm?periodo=0&q=${encodeURIComponent(l.nome)}`} className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-background">
										<span className="min-w-40 flex-1 font-medium text-foreground">{l.nome}</span>
										<span className="min-w-40 flex-1 text-sm text-foreground-secondary">{l.veiculo ?? 'Carro não informado'}</span>
										<span className="w-40 text-sm text-foreground-secondary">{l.vendedor ?? 'Sem vendedor'}</span>
										<span className={`flex w-24 items-center justify-end gap-1 text-sm font-medium tabular-nums ${COR_DO_ATRASO[l.nivel]}`}>
											<Clock className="h-4 w-4" />
											{l.espera ?? 'sem data'}
										</span>
									</Link>
								</li>
							))}
						</ul>
					</Cartao>
				)}
			</Bloco>

			<Bloco titulo={`Comercial em ${mes.nome}`} nota={`comparado com ${mesAnterior.nome} inteiro`}>
				<div className="grid gap-4 lg:grid-cols-2">
					<Cartao className="flex flex-wrap gap-6">
						<Medida valor={numero(mes.leads)} rotulo="leads novos" comparacao={`${numero(mesAnterior.leads)} em ${mesAnterior.nome}`} />
						<Medida valor={numero(mes.vendas)} rotulo="vendas" comparacao={`${numero(mesAnterior.vendas)} em ${mesAnterior.nome}`} />
						<Medida
							valor={mes.valor > 0 ? real(mes.valor) : '—'}
							rotulo="em vendas com valor informado"
							comparacao={mesAnterior.valor > 0 ? `${real(mesAnterior.valor)} em ${mesAnterior.nome}` : undefined}
						/>
					</Cartao>
					<Cartao className="flex flex-wrap gap-6">
						{funil.map(f => (
							<Medida key={f.id} valor={numero(f.total)} rotulo={f.rotulo.toLowerCase()} />
						))}
					</Cartao>
				</div>
			</Bloco>
		</>
	)
}

function BlocoProcurados({ dados }: { dados: DadosDoInicio['procurados'] }) {
	if (!dados) return <Bloco titulo="Carros mais procurados"><NaoCarregou oQue="as visitas" /></Bloco>
	if (dados.length === 0) return null
	return (
		<Bloco titulo="Carros mais procurados" nota="visitas à ficha nos últimos 7 dias" link={{ rotulo: 'Ver todos', href: '/admin/visitors/veiculos' }}>
			<Cartao className="p-0">
				<ul className="divide-y divide-border">
					{dados.map(c => (
						<li key={c.slug} className="flex min-h-12 flex-wrap items-center gap-x-4 px-5 py-3">
							<Link href={`/veiculo/${c.slug}`} target="_blank" className="min-w-40 flex-1 font-medium text-foreground hover:underline">
								{c.nome}
							</Link>
							<span className="w-32 text-right text-sm tabular-nums text-foreground-secondary">{numero(c.sessoes)} {c.sessoes === 1 ? 'visita' : 'visitas'}</span>
							<span className="w-36 text-right text-sm tabular-nums text-foreground-secondary">{numero(c.whatsapp)} no WhatsApp</span>
						</li>
					))}
				</ul>
			</Cartao>
		</Bloco>
	)
}

function BlocoMarketing({ dados }: { dados: DadosDoInicio['marketing'] }) {
	if (!dados) return <Bloco titulo="Marketing"><NaoCarregou oQue="as tarefas" /></Bloco>
	const dia = (isoData: string) => new Date(isoData).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })
	return (
		<Bloco
			titulo="Marketing"
			nota={`${numero(dados.tarefasEmAberto)} ${dados.tarefasEmAberto === 1 ? 'tarefa em aberto' : 'tarefas em aberto'} no time`}
			link={{ rotulo: 'Abrir o Marketing', href: '/admin/marketing' }}
		>
			<div className="grid gap-4 lg:grid-cols-3">
				<Link href="/admin/marketing?visao=criativos" className="block rounded-xl border border-border bg-background-card p-5 hover:border-primary/50">
					<Medida valor={numero(dados.fila)} rotulo={dados.fila === 1 ? 'peça aguardando publicação' : 'peças aguardando publicação'} />
				</Link>
				<Cartao className="p-0 lg:col-span-2">
					<div className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">Minhas tarefas</div>
					{dados.tarefas.length === 0 ? (
						<p className="px-5 py-4 text-sm text-foreground-secondary">Nenhuma tarefa em aberto no seu nome.</p>
					) : (
						<ul className="divide-y divide-border">
							{dados.tarefas.map(t => (
								<li key={t.id}>
									<Link href={`/admin/marketing?visao=kanban&q=${encodeURIComponent(t.titulo)}`} className="flex min-h-12 items-center gap-4 px-5 py-3 hover:bg-background">
										<span className="flex-1 text-foreground">{t.titulo}</span>
										<span className={`text-sm tabular-nums ${t.atrasada ? 'font-medium text-red-600 dark:text-red-400' : 'text-foreground-secondary'}`}>
											{t.prazo ? `${t.atrasada ? 'atrasada desde' : 'até'} ${dia(t.prazo)}` : 'sem prazo'}
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
				</Cartao>
			</div>
		</Bloco>
	)
}

function BlocoConteudo({ dados }: { dados: DadosDoInicio['conteudo'] }) {
	if (!dados || (dados.totalRascunhos === 0 && dados.campanhasPendentes === 0)) return null
	return (
		<Bloco titulo="Conteúdo parado" link={{ rotulo: 'Abrir o Blog', href: '/admin/blog?status=rascunho' }}>
			<Cartao className="p-0">
				<ul className="divide-y divide-border">
					{dados.rascunhos.map(r => (
						<li key={r.id} className="flex min-h-12 items-center gap-4 px-5 py-3">
							<span className="flex-1 text-foreground">{r.titulo}</span>
							<span className="text-sm text-foreground-secondary">rascunho do blog</span>
						</li>
					))}
					{dados.totalRascunhos > dados.rascunhos.length && (
						<li className="px-5 py-3 text-sm text-foreground-secondary">
							e mais {numero(dados.totalRascunhos - dados.rascunhos.length)} rascunhos
						</li>
					)}
					{dados.campanhasPendentes > 0 && (
						<li>
							<Link href="/admin/newsletter/campaigns" className="flex min-h-12 items-center gap-4 px-5 py-3 hover:bg-background">
								<span className="flex-1 text-foreground">
									{numero(dados.campanhasPendentes)} {dados.campanhasPendentes === 1 ? 'campanha de newsletter não enviada' : 'campanhas de newsletter não enviadas'}
								</span>
								<ArrowRight className="h-4 w-4 text-foreground-secondary" />
							</Link>
						</li>
					)}
				</ul>
			</Cartao>
		</Bloco>
	)
}

function BlocoSaldo({ dados, comLink }: { dados: DadosDoInicio['saldo']; comLink: boolean }) {
	return (
		<Bloco titulo="Saldo da Meta Ads" link={comLink ? { rotulo: 'Ver campanhas', href: '/admin/marketing' } : undefined}>
			{dados ? <SaldoMeta saldo={dados} /> : <NaoCarregou oQue="o saldo da Meta" />}
		</Bloco>
	)
}

function Pulso({ resumo }: { resumo: ResumoAdmin }) {
	const item = (i: Indicador) => (
		<Medida key={i.rotulo} valor={i.valor === null ? '—' : numero(i.valor)} rotulo={i.rotulo} />
	)
	return (
		<Bloco titulo="Últimas 24 horas">
			<Cartao className="flex flex-wrap gap-6">
				{item(resumo.pulso.sessoes)}
				{item(resumo.pulso.whatsapp)}
				{item(resumo.pulso.leads)}
			</Cartao>
		</Bloco>
	)
}

function Atalhos({ sections, resumo }: { sections: AdminSection[]; resumo: ResumoAdmin | null }) {
	return (
		<Bloco titulo="Atalhos">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
				{GRUPOS.flatMap(g => sections.filter(s => s.grupo === g.id)).map(({ href, label, description, Icon }) => {
					const ind = resumo?.porSecao[href]
					return (
						<Link key={href} href={href} className="group flex min-h-16 items-center gap-4 rounded-xl border border-border bg-background-card px-4 py-3 transition-colors hover:border-primary/50">
							<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<Icon className="h-5 w-5" />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block font-semibold text-foreground">{label}</span>
								<span className="block truncate text-sm text-foreground-secondary">
									{ind && ind.rotulo !== '' && ind.valor !== null ? `${numero(ind.valor)} ${ind.rotulo}` : description}
								</span>
							</span>
							<ArrowUpRight className="h-4 w-4 shrink-0 text-foreground-secondary opacity-0 transition-opacity group-hover:opacity-100" />
						</Link>
					)
				})}
			</div>
		</Bloco>
	)
}

/* --------------------------------------------------------------- tela */

export type BlocoDoInicio = 'carros' | 'comercial' | 'procurados' | 'marketing' | 'conteudo' | 'pulso' | 'saldo'

/**
 * A ordem dos blocos por papel. Só entra o que a pessoa pode ver (`inicio.ve`);
 * a ordem diz o que vem primeiro para cada um.
 */
export const ORDEM_POR_PAPEL: Record<string, BlocoDoInicio[]> = {
	// Faz criativos: os carros sem peça são a tela.
	operador: ['carros', 'saldo', 'procurados', 'conteudo'],
	// Sócia, comercial: leads e o mês primeiro.
	owner: ['comercial', 'saldo', 'procurados', 'pulso', 'carros', 'marketing', 'conteudo'],
	marketing: ['saldo', 'marketing', 'carros', 'conteudo'],
	gerente: ['carros', 'marketing', 'conteudo'],
	admin: ['pulso', 'saldo', 'comercial', 'marketing', 'carros', 'procurados', 'conteudo'],
}

export interface DadosDaTela {
	nome: string
	papel: string
	/** Papel cru (admin, owner, operador...), para a ordem dos blocos. */
	role: string
	/** Hora local de São Paulo, 0–23: decide a saudação. */
	hora: number
	/** "terça-feira, 2 de setembro" */
	dia: string
	sections: AdminSection[]
	resumo: ResumoAdmin | null
	inicio: DadosDoInicio | null
}

export function AdminHome({ nome, papel, role, hora, dia, sections, resumo, inicio }: DadosDaTela) {
	const ordem = ORDEM_POR_PAPEL[role] ?? ORDEM_POR_PAPEL.gerente
	return (
		<div className={`${LARGURA} pb-12 pt-8`}>
			<header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">
						{saudacao(hora)}, {nome}
					</h1>
					<p className="mt-1 text-sm text-foreground-secondary">{papel}</p>
				</div>
				{/* `capitalize` maiúsculiza toda palavra e devolve "Terça-Feira, 2 De
				    Setembro". Só a primeira letra da frase é o certo em português. */}
				<p className="text-sm text-foreground-secondary first-letter:uppercase">{dia}</p>
			</header>

			{sections.length === 0 ? (
				<p className="py-10 text-foreground-secondary">
					Seu perfil ainda não tem seções liberadas. Fale com um administrador.
				</p>
			) : (
				<>
					{inicio &&
						ordem.map(bloco => {
							if (bloco === 'pulso') return resumo && inicio.ve.procurados ? <Pulso key={bloco} resumo={resumo} /> : null
							if (!inicio.ve[bloco]) return null
							if (bloco === 'saldo') return <BlocoSaldo key={bloco} dados={inicio.saldo} comLink={inicio.ve.marketing} />
							if (bloco === 'carros') return <BlocoCarros key={bloco} dados={inicio.carros} />
							if (bloco === 'comercial') return <BlocoComercial key={bloco} dados={inicio.comercial} />
							if (bloco === 'procurados') return <BlocoProcurados key={bloco} dados={inicio.procurados} />
							if (bloco === 'marketing') return <BlocoMarketing key={bloco} dados={inicio.marketing} />
							return <BlocoConteudo key={bloco} dados={inicio.conteudo} />
						})}
					<Atalhos sections={sections} resumo={resumo} />
				</>
			)}
		</div>
	)
}

/**
 * A tela inicial do admin — só o desenho.
 *
 * Separada da página porque a página faz autenticação e nove consultas, e nada
 * disso roda fora de um servidor com banco: sem esta divisão não há como olhar
 * o layout antes de subir. Aqui entram dados prontos e sai a tela.
 */
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { GRUPOS, type AdminSection } from '@/lib/admin-sections'
import type { Indicador, ResumoAdmin } from '@/lib/admin-resumo'

/**
 * A largura era `max-w-7xl` (1280px). Num monitor de 2000px isso deixava a
 * grade inteira ocupando o terço superior esquerdo, com os cards parecendo
 * encolhidos e o resto da tela vazio. Aqui a página acompanha o monitor e a
 * grade ganha uma quarta coluna quando há espaço.
 */
const LARGURA = 'mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-10'

export function saudacao(hora: number): string {
	if (hora < 12) return 'Bom dia'
	if (hora < 18) return 'Boa tarde'
	return 'Boa noite'
}

/** Número grande. `null` vira "—": não consegui contar ≠ contei zero. */
function Numero({ indicador, tamanho }: { indicador: Indicador; tamanho: 'grande' | 'pequeno' }) {
	const vazio = indicador.valor === null
	return (
		<span
			className={
				(tamanho === 'grande' ? 'text-3xl' : 'text-xl') +
				' font-semibold tabular-nums tracking-tight ' +
				(vazio ? 'text-foreground-secondary' : 'text-foreground')
			}
			title={vazio ? 'Não foi possível contar agora' : undefined}
		>
			{vazio ? '—' : indicador.valor!.toLocaleString('pt-BR')}
		</span>
	)
}

function Pulso({ indicador }: { indicador: Indicador }) {
	return (
		<div className="flex-1 border-l border-border pl-4 first:border-l-0 first:pl-0 sm:pl-7 sm:first:pl-0">
			<Numero indicador={indicador} tamanho="grande" />
			<div className="mt-0.5 text-[11px] uppercase tracking-wider text-foreground-secondary sm:text-xs">
				{indicador.rotulo}
			</div>
		</div>
	)
}

function Card({ secao, indicador }: { secao: AdminSection; indicador?: Indicador }) {
	const { label, href, description, Icon } = secao
	const temNumero = indicador && indicador.rotulo !== ''
	return (
		<Link
			href={href}
			className="group relative flex flex-col rounded-xl border border-border bg-background-card p-5 transition-colors hover:border-primary/50 hover:bg-background"
		>
			<ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-foreground-secondary opacity-0 transition-opacity group-hover:opacity-100" />
			<div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Icon className="h-5 w-5" />
			</div>
			<div className="mt-3 font-semibold text-foreground">{label}</div>
			<div className="mt-0.5 text-sm text-foreground-secondary">{description}</div>
			{/* O número fica preso ao pé do card com `mt-auto`: sem isso, um card de
			    descrição curta encolhe e a linha de baixo deixa de alinhar com a
			    dos vizinhos, que é o que fazia a grade parecer desmontada. */}
			{temNumero && (
				<div className="mt-auto flex items-baseline gap-2 border-t border-border pt-3">
					<Numero indicador={indicador} tamanho="pequeno" />
					<span className="text-xs text-foreground-secondary">{indicador.rotulo}</span>
				</div>
			)}
		</Link>
	)
}

export interface DadosDaTela {
	nome: string
	papel: string
	/** Hora local de São Paulo, 0–23 — decide a saudação. */
	hora: number
	/** "terça-feira, 2 de setembro" */
	dia: string
	sections: AdminSection[]
	resumo: ResumoAdmin | null
}

export function AdminHome({ nome, papel, hora, dia, sections, resumo }: DadosDaTela) {
	return (
		<div className={`${LARGURA} py-8`}>
			<header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
				<div>
					<h1 className="text-2xl font-bold text-foreground">
						{saudacao(hora)}, {nome}
					</h1>
					<p className="mt-1 text-sm text-primary">{papel}</p>
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
					{resumo && (
						<section className="mt-6 flex rounded-xl border border-border bg-background-card px-5 py-5 sm:px-7">
							<Pulso indicador={resumo.pulso.sessoes} />
							<Pulso indicador={resumo.pulso.whatsapp} />
							<Pulso indicador={resumo.pulso.leads} />
						</section>
					)}

					{GRUPOS.map(grupo => {
						const doGrupo = sections.filter(s => s.grupo === grupo.id)
						if (doGrupo.length === 0) return null
						return (
							<section key={grupo.id} className="mt-10">
								<div className="mb-4 flex items-baseline gap-3">
									<h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
										{grupo.titulo}
									</h2>
									<span className="hidden text-xs text-foreground-secondary sm:inline">
										{grupo.resumo}
									</span>
								</div>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
									{doGrupo.map(secao => (
										<Card key={secao.href} secao={secao} indicador={resumo?.porSecao[secao.href]} />
									))}
								</div>
							</section>
						)
					})}
				</>
			)}
		</div>
	)
}

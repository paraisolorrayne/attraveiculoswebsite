'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Link2, Loader2 } from 'lucide-react'
import type { CanalTrafego } from '@/lib/traffic-channel'
import { InfoDica } from '../crm/info-dica'
import { Secao } from './visitors-tabelas'
import { fmtNum, fmtPct, larguraRelativa, taxa } from './visitors-metrics'

// Receita por canal — o fechamento do ciclo site → CRM.
//
// Regra desta seção: NENHUM número de receita aparece sem o denominador que o sustenta. A
// ligação entre a sessão do site e o card do CRM é hoje parcial (ver a rota
// /api/admin/visitors/atribuicao-receita), então a primeira coisa que a tela mostra é quanto da
// base foi realmente ligada. Se nada ligou, a seção diz isso com todas as letras em vez de
// exibir uma tabela vazia que passaria por "canal nenhum vendeu".

// Os cinco contadores do meio são uma partição dos leads do período: cada lead cai em exatamente
// um deles e a soma fecha com `cards`. `cards_com_telefone` e `cards_com_candidato_de_sessao` são
// informativos e se sobrepõem à partição — nunca somar com os outros.
interface Cobertura {
	cards: number
	cards_com_telefone: number
	cards_com_candidato_de_sessao: number
	cards_por_chave_forte: number
	cards_por_telefone: number
	cards_sem_ligacao_sem_telefone: number
	cards_telefone_sem_perfil: number
	cards_telefone_sem_sessao: number
	perfis_com_telefone: number
	perfis_truncados: boolean
	cards_truncados: boolean
	janela_dias: number
}

interface LinhaCanalReceita {
	canal: CanalTrafego
	rotulo: string
	cor: string
	cards: number
	ganhos: number
	perdidos: number
	abertos: number
	receita: number
	ganhos_sem_valor: number
}

interface LinhaCampanhaReceita {
	campanha: string
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
	cards: number
	ganhos: number
	receita: number
	ganhos_sem_valor: number
}

interface LinhaOrigemCrm {
	origem: string
	rotulo: string
	leitura: string
	cards: number
	ganhos: number
	perdidos: number
	receita: number
	ganhos_sem_valor: number
}

export interface AtribuicaoReceita {
	periodo: { dias: number; desde: string | null }
	base: string
	cobertura: Cobertura
	campos_procurados: readonly string[]
	campos_candidatos: { campo: string; cards_com_o_campo: number }[]
	total: {
		cards: number
		ganhos: number
		perdidos: number
		abertos: number
		receita: number
		ganhos_sem_valor: number
	}
	ligado: { cards: number; ganhos: number; receita: number; ganhos_sem_valor: number }
	canais: LinhaCanalReceita[]
	campanhas: LinhaCampanhaReceita[]
	campanhas_total: number
	origens_crm: LinhaOrigemCrm[]
}

const TH = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground-secondary whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'

function fmtReais(valor: number): string {
	return valor.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})
}

function Badge({ cor, children }: { cor: string; children: ReactNode }) {
	return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cor}`}>{children}</span>
}

/**
 * Aviso de ganhos sem `valor`: a receita da linha está subestimada e o painel precisa dizer
 * quanto, senão o gestor compara canais com réguas diferentes sem saber.
 */
function SemValor({ quantos }: { quantos: number }) {
	if (quantos <= 0) return null
	return (
		<span
			className="ml-1 text-[10px] text-amber-600 dark:text-amber-400"
			title={`${quantos} venda(s) fechada(s) sem o campo valor preenchido no CRM — não entram nesta soma.`}
		>
			+{quantos} s/ valor
		</span>
	)
}

/**
 * O bloco mais importante da seção: quanto da base foi realmente ligada. Fica ANTES de qualquer
 * tabela de receita de propósito.
 */
function BlocoCobertura({ dados }: { dados: AtribuicaoReceita }) {
	const c = dados.cobertura
	const ligados = c.cards_por_chave_forte + c.cards_por_telefone
	// A outra metade da mesma partição: ligados + naoLigados = c.cards, sempre.
	const naoLigados =
		c.cards_sem_ligacao_sem_telefone + c.cards_telefone_sem_perfil + c.cards_telefone_sem_sessao
	const pctCards = taxa(ligados, c.cards)
	const pctReceita = taxa(dados.ligado.receita, dados.total.receita)
	const semLigacao = ligados === 0

	return (
		<div
			className={`mx-4 mt-4 rounded-lg border p-3 text-xs leading-relaxed ${
				semLigacao
					? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
					: 'border-border bg-background-soft text-foreground-secondary'
			}`}
		>
			<p className="flex items-start gap-2 font-medium">
				{semLigacao ? (
					<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
				) : (
					<Link2 className="w-4 h-4 shrink-0 mt-0.5" />
				)}
				<span>
					{semLigacao ? (
						<>
							Nenhum dos {fmtNum(c.cards)} leads do período pôde ser ligado a uma visita ao site.
							Sem essa ligação não dá para dizer qual canal vendeu — e é melhor avisar do que
							mostrar uma tabela que pareceria dizer que canal nenhum vendeu.
						</>
					) : (
						<>
							{fmtNum(ligados)} de {fmtNum(c.cards)} leads ({fmtPct(pctCards)}) foram ligados a uma
							visita ao site.{' '}
							{dados.total.receita > 0 ? (
								<>
									A receita creditada a um canal abaixo é {fmtReais(dados.ligado.receita)} de{' '}
									{fmtReais(dados.total.receita)} ({fmtPct(pctReceita)}) fechados no período — o
									resto vendeu, mas sem origem que se possa sustentar.
								</>
							) : (
								<>
									Nenhuma venda com valor foi fechada no período, então não há receita para creditar
									a canal nenhum.
								</>
							)}
						</>
					)}
				</span>
			</p>

			<ul className="mt-2 space-y-1 pl-6 list-disc marker:text-foreground-secondary">
				<li>
					Ligação certa (o CRM devolveu o identificador da visita):{' '}
					<strong>{fmtNum(c.cards_por_chave_forte)}</strong>
					{c.cards_com_candidato_de_sessao > 0 && (
						<>
							{' '}
							— {fmtNum(c.cards_com_candidato_de_sessao)} leads trazem um campo com esse nome, mas só
							os acima correspondem a uma visita real.
						</>
					)}
					{c.cards_com_candidato_de_sessao === 0 && (
						<> — hoje o CRM não devolve esse identificador, por isso a ligação certa é zero.</>
					)}
				</li>
				<li>
					Ligação provável, pelo telefone (DDD + 8 últimos dígitos):{' '}
					<strong>{fmtNum(c.cards_por_telefone)}</strong>. Credita a última visita da pessoa nos{' '}
					{c.janela_dias} dias anteriores ao lead. Só alcança quem já deixou o telefone no site.
				</li>
				<li>
					Sem ligação: <strong>{fmtNum(naoLigados)}</strong> —{' '}
					{fmtNum(c.cards_sem_ligacao_sem_telefone)} sem telefone no lead,{' '}
					{fmtNum(c.cards_telefone_sem_perfil)} com telefone que nunca se identificou no site,{' '}
					{fmtNum(c.cards_telefone_sem_sessao)} identificados mas sem visita nesse prazo. Com os
					ligados das duas linhas acima, fecham os {fmtNum(c.cards)} leads do período. Para
					comparação: {fmtNum(c.perfis_com_telefone)} pessoas deixaram telefone no site.
				</li>
			</ul>

			{(c.cards_truncados || c.perfis_truncados) && (
				<p className="mt-2">
					Atenção: o período tem mais registros do que esta tela consegue ler de uma vez — os
					números acima estão incompletos. Escolha um período menor.
				</p>
			)}
		</div>
	)
}

export function SecaoReceitaPorCanal({ dias }: { dias: number }) {
	const [dados, setDados] = useState<AtribuicaoReceita | null>(null)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)

	const carregar = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const resposta = await fetch(`/api/admin/visitors/atribuicao-receita?dias=${dias}`)
			if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
			setDados(await resposta.json())
		} catch (e) {
			console.error('[Visitors] Falha ao carregar atribuição de receita:', e)
			setErro('Não foi possível carregar a receita por canal.')
		} finally {
			setCarregando(false)
		}
	}, [dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	const dica =
		'Cruza os leads do CRM com as visitas ao site para dizer qual canal traz venda, não só clique. O lead entra pela data em que foi criado, não pela data da venda: assim o crédito vai para a mídia que trouxe aquele cliente, mesmo que a venda feche semanas depois. Só conta como venda o lead na etapa "Encerrado — Ganho".'

	if (carregando && !dados) {
		return (
			<Secao titulo="Receita por canal" dica={dica}>
				<div className="p-12 text-center text-foreground-secondary">
					<Loader2 className="w-6 h-6 animate-spin mx-auto" />
				</div>
			</Secao>
		)
	}

	if (erro || !dados) {
		return (
			<Secao titulo="Receita por canal" dica={dica}>
				<p className="px-4 py-8 text-center text-sm text-red-500">
					{erro ?? 'Sem dados de receita.'}
				</p>
			</Secao>
		)
	}

	const t = dados.total
	const maiorReceitaCanal = Math.max(0, ...dados.canais.map(c => c.receita))

	const kpis = [
		{
			rotulo: 'Leads no período',
			valor: fmtNum(t.cards),
			dica: 'Leads criados no CRM dentro do período selecionado, tenham vindo do site ou não.',
		},
		{
			rotulo: 'Vendas fechadas',
			valor: fmtNum(t.ganhos),
			dica: 'Leads na etapa "Encerrado — Ganho" do CRM. É o único estado que conta como venda; proposta em aberto não entra.',
		},
		{
			rotulo: 'Receita registrada',
			valor: fmtReais(t.receita),
			dica:
				t.ganhos_sem_valor > 0
					? `Soma dos valores das vendas fechadas. ${t.ganhos_sem_valor} venda(s) foram fechadas sem valor preenchido no CRM e ficam de fora desta soma.`
					: 'Soma dos valores das vendas fechadas no período, conforme preenchido no CRM.',
		},
		{
			rotulo: 'Receita com canal',
			valor: fmtReais(dados.ligado.receita),
			dica: 'Parte da receita ao lado que dá para creditar a um canal, porque o cliente foi reconhecido como visitante do site. O restante vendeu, mas sem origem comprovável — não use esse resto para julgar mídia.',
			destaque: dados.ligado.receita > 0,
		},
	]

	return (
		<Secao
			titulo="Receita por canal"
			dica={dica}
			acessorio={
				<span className="text-xs text-foreground-secondary">
					{fmtNum(t.ganhos)} venda(s) fechada(s) · {fmtReais(t.receita)} no período
				</span>
			}
		>
			<BlocoCobertura dados={dados} />

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
				{kpis.map(k => (
					<div
						key={k.rotulo}
						className={`p-3 rounded-xl border ${k.destaque ? 'border-primary/50' : 'border-border'}`}
					>
						<div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground-secondary">
							{k.rotulo}
							<InfoDica>{k.dica}</InfoDica>
						</div>
						<div
							className={`mt-1 text-lg font-semibold truncate ${k.destaque ? 'text-primary' : 'text-foreground'}`}
						>
							{k.valor}
						</div>
					</div>
				))}
			</div>

			{dados.canais.length > 0 && (
				<div className="overflow-x-auto border-t border-border">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								<th className={`${TH} text-left`}>Canal</th>
								<th className={`${TH} text-right`}>Leads ligados</th>
								<th className={`${TH} text-right`}>Vendas</th>
								<th className={`${TH} text-right`}>Perdidos</th>
								<th className={`${TH} text-left`}>Receita</th>
								<th className={`${TH} text-right`}>Ticket médio</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{dados.canais.map(c => (
								<tr key={c.canal} className="hover:bg-background-soft/60">
									<td className={TD}>
										<Badge cor={c.cor}>{c.rotulo}</Badge>
									</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.cards)}</td>
									<td className={`${TD} text-right tabular-nums font-medium`}>{fmtNum(c.ganhos)}</td>
									<td className={`${TD} text-right tabular-nums text-foreground-secondary`}>
										{fmtNum(c.perdidos)}
									</td>
									<td className={`${TD} min-w-[180px]`}>
										<div className="flex items-baseline gap-1">
											<span className="font-semibold tabular-nums">{fmtReais(c.receita)}</span>
											<SemValor quantos={c.ganhos_sem_valor} />
										</div>
										<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
											<div
												className="h-full rounded-full bg-emerald-500"
												style={{ width: larguraRelativa(c.receita, maiorReceitaCanal) }}
											/>
										</div>
									</td>
									<td className={`${TD} text-right tabular-nums text-foreground-secondary`}>
										{c.ganhos > 0 ? fmtReais(c.receita / c.ganhos) : '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{dados.campanhas.length > 0 && (
				<div className="overflow-x-auto border-t border-border">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								<th className={`${TH} text-left`}>Campanha</th>
								<th className={`${TH} text-left`}>Canal</th>
								<th className={`${TH} text-right`}>Leads ligados</th>
								<th className={`${TH} text-right`}>Vendas</th>
								<th className={`${TH} text-right`}>Receita</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{dados.campanhas.map(c => (
								<tr key={c.campanha} className="hover:bg-background-soft/60">
									<td className={`${TD} max-w-[280px]`}>
										<p className="truncate font-medium" title={c.campanha}>
											{c.campanha}
										</p>
									</td>
									<td className={TD}>
										<Badge cor={c.cor_canal}>{c.rotulo_canal}</Badge>
									</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.cards)}</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.ganhos)}</td>
									<td className={`${TD} text-right tabular-nums font-medium`}>
										{fmtReais(c.receita)}
										<SemValor quantos={c.ganhos_sem_valor} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* A origem declarada pelo CRM não depende de nenhuma ligação — funciona para 100% dos
			    cards. É o recorte honesto que sobra enquanto o ciclo não fecha, desde que a leitura
			    de cada valor esteja escrita ao lado (o vocabulário do CRM não é o do site). */}
			<div className="border-t border-border">
				<h3 className="flex items-center gap-1.5 px-4 pt-4 pb-1 text-sm font-semibold text-foreground">
					Origem declarada pelo CRM
					<InfoDica>
						A origem como o próprio CRM a registra, com as palavras dele. Não é o canal do site:
						um lead marcado como &ldquo;Patrocinado&rdquo; tanto pode ser Google quanto Meta, e o
						CRM não guarda a campanha. Vale para todos os leads, inclusive os que não puderam ser
						ligados a nenhuma visita — por isso serve de conferência grosseira das tabelas acima.
					</InfoDica>
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								<th className={`${TH} text-left`}>Origem</th>
								{/* "Leads", não "Cards": card é o nome interno do CRM e o resto da tela
								    (KPIs, colunas acima) já chama a mesma coisa de lead. */}
								<th className={`${TH} text-right`}>Leads</th>
								<th className={`${TH} text-left`}>Participação</th>
								<th className={`${TH} text-right`}>Vendas</th>
								<th className={`${TH} text-right`}>Receita</th>
								<th className={`${TH} text-left`}>Como ler</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{dados.origens_crm.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-3 py-8 text-center text-sm text-foreground-secondary">
										Nenhum lead do CRM no período selecionado.
									</td>
								</tr>
							) : (
								dados.origens_crm.map(o => (
									<tr key={o.origem} className="hover:bg-background-soft/60">
										<td className={`${TD} font-medium`}>{o.rotulo}</td>
										<td className={`${TD} text-right tabular-nums`}>{fmtNum(o.cards)}</td>
										<td className={`${TD} min-w-[120px]`}>
											<div className="h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
												<div
													className="h-full rounded-full bg-foreground/25"
													style={{ width: larguraRelativa(o.cards, t.cards) }}
												/>
											</div>
										</td>
										<td className={`${TD} text-right tabular-nums`}>{fmtNum(o.ganhos)}</td>
										<td className={`${TD} text-right tabular-nums font-medium`}>
											{fmtReais(o.receita)}
											<SemValor quantos={o.ganhos_sem_valor} />
										</td>
										<td className="px-3 py-2.5 text-xs text-foreground-secondary max-w-[340px] whitespace-normal">
											{o.leitura}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</Secao>
	)
}

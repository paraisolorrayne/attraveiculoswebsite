'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Link2, Loader2 } from 'lucide-react'
import type { CanalTrafego } from '@/lib/traffic-channel'
import { InfoDica } from '../crm/info-dica'
import { Secao } from './visitors-tabelas'
import { TabelaOrdenavel } from './visitors-tabela'
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
				<div className="border-t border-border">
					<TabelaOrdenavel
						colunas={[
							{
								chave: 'canal',
								titulo: 'Canal',
								filtro: 'opcoes',
								valor: c => c.rotulo,
								render: c => <Badge cor={c.cor}>{c.rotulo}</Badge>,
							},
							{
								chave: 'cards',
								titulo: 'Leads ligados',
								filtro: 'numero',
								valor: c => c.cards,
								alinhar: 'dir',
								classe: 'tabular-nums',
								render: c => fmtNum(c.cards),
							},
							{
								chave: 'ganhos',
								titulo: 'Vendas',
								filtro: 'numero',
								valor: c => c.ganhos,
								alinhar: 'dir',
								classe: 'tabular-nums font-medium',
								render: c => fmtNum(c.ganhos),
							},
							{
								chave: 'perdidos',
								titulo: 'Perdidos',
								filtro: 'numero',
								valor: c => c.perdidos,
								alinhar: 'dir',
								classe: 'tabular-nums text-foreground-secondary',
								render: c => fmtNum(c.perdidos),
							},
							{
								chave: 'receita',
								titulo: 'Receita',
								filtro: 'numero',
								valor: c => c.receita,
								classe: 'min-w-[180px]',
								render: c => (
									<>
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
									</>
								),
							},
							{
								chave: 'ticket',
								titulo: 'Ticket médio',
								filtro: 'numero',
								valor: c => (c.ganhos > 0 ? c.receita / c.ganhos : null),
								alinhar: 'dir',
								classe: 'tabular-nums text-foreground-secondary',
								render: c => (c.ganhos > 0 ? fmtReais(c.receita / c.ganhos) : '—'),
							},
						]}
						linhas={dados.canais}
						chaveLinha={c => c.canal}
						vazio="Nenhum canal com lead ligado no período."
					/>
				</div>
			)}

			{dados.campanhas.length > 0 && (
				<div className="border-t border-border">
					<TabelaOrdenavel
						colunas={[
							{
								chave: 'campanha',
								titulo: 'Campanha',
								filtro: 'texto',
								valor: c => c.campanha,
								classe: 'max-w-[280px]',
								render: c => (
									<p className="truncate font-medium" title={c.campanha}>
										{c.campanha}
									</p>
								),
							},
							{
								chave: 'canal',
								titulo: 'Canal',
								filtro: 'opcoes',
								valor: c => c.rotulo_canal,
								render: c => <Badge cor={c.cor_canal}>{c.rotulo_canal}</Badge>,
							},
							{
								chave: 'cards',
								titulo: 'Leads ligados',
								filtro: 'numero',
								valor: c => c.cards,
								alinhar: 'dir',
								classe: 'tabular-nums',
								render: c => fmtNum(c.cards),
							},
							{
								chave: 'ganhos',
								titulo: 'Vendas',
								filtro: 'numero',
								valor: c => c.ganhos,
								alinhar: 'dir',
								classe: 'tabular-nums',
								render: c => fmtNum(c.ganhos),
							},
							{
								chave: 'receita',
								titulo: 'Receita',
								filtro: 'numero',
								valor: c => c.receita,
								alinhar: 'dir',
								classe: 'tabular-nums font-medium',
								render: c => (
									<>
										{fmtReais(c.receita)}
										<SemValor quantos={c.ganhos_sem_valor} />
									</>
								),
							},
						]}
						linhas={dados.campanhas}
						chaveLinha={c => c.campanha}
						vazio="Nenhuma campanha com lead ligado no período."
					/>
				</div>
			)}

		</Secao>
	)
}

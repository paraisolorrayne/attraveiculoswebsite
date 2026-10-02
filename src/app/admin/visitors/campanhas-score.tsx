'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SEM_CAMPANHA } from '@/lib/traffic-channel'
import { FAIXAS_TEMPO_CLIQUE, type LinhaCampanhaScore } from '@/lib/visitors/score-clique'
import { Secao } from './visitors-tabelas'
import { corTaxa, fmtDuracao, fmtNum, fmtPct, taxa, VOLUME_MINIMO } from './visitors-metrics'
import { BarraControles, ConteudoVolume, Erro } from './visitors-ui'
import { TabelaOrdenavel, type ColunaTabela } from './visitors-tabela'
import { useVisitantesApi } from './visitantes-api'

// Tabela de campanhas com conversão e score (tempo até o clique no WhatsApp).
// Mora aqui, e não dentro de uma aba, porque aparece em dois lugares: na aba
// Origens do painel de visitantes e na aba Estatísticas do Marketing.

/** Média ponderada do período: soma de pesos / sessões mensuráveis de todas as campanhas. */
function scoreMedio(linhas: LinhaCampanhaScore[]): number {
	const mensuraveis = linhas.reduce((s, l) => s + l.sessoes_mensuraveis, 0)
	return taxa(
		linhas.reduce((s, l) => s + l.soma_pesos, 0),
		mensuraveis,
	)
}

export function TabelaCampanhasScore({ linhas, scoreDesde }: { linhas: LinhaCampanhaScore[]; scoreDesde: string }) {
	const { link } = useVisitantesApi()
	const total = linhas.reduce((s, l) => s + l.sessoes, 0)
	const maior = Math.max(0, ...linhas.map(l => l.sessoes))
	// Mesma régua da coluna: sem as sessões de clique acidental.
	const mediaConversao = taxa(
		linhas.reduce((s, l) => s + Math.max(0, l.whatsapp - l.acidentais), 0),
		total,
	)
	const mediaScore = scoreMedio(linhas)
	const pesos = FAIXAS_TEMPO_CLIQUE.map(f => `${f.rotulo} = ${String(f.peso).replace('.', ',')}`).join('; ')
	const desde = new Date(scoreDesde).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

	const colunas: ColunaTabela<LinhaCampanhaScore>[] = [
		{
			chave: 'campanha',
			titulo: 'Campanha',
			filtro: 'texto',
			valor: l => l.rotulo,
			classe: 'max-w-[300px]',
			render: l =>
				l.chave === SEM_CAMPANHA ? (
					<span className="text-foreground-secondary">{l.rotulo}</span>
				) : (
					<Link
						href={link(`/campanha/${encodeURIComponent(l.chave)}`)}
						className="block truncate font-medium hover:underline"
						title={l.rotulo}
					>
						{l.rotulo}
					</Link>
				),
		},
		{
			chave: 'sessoes',
			titulo: 'Sessões',
			filtro: 'numero',
			valor: l => l.sessoes,
			classe: 'min-w-[140px]',
			render: l => <ConteudoVolume valor={l.sessoes} maximo={maior} total={total} />,
		},
		{
			chave: 'whatsapp',
			titulo: 'Clicaram no WhatsApp',
			filtro: 'numero',
			valor: l => Math.max(0, l.whatsapp - l.acidentais),
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => fmtNum(Math.max(0, l.whatsapp - l.acidentais)),
		},
		{
			chave: 'acidentais',
			titulo: 'Acidentais (< 3 s)',
			filtro: 'numero',
			valor: l => l.acidentais,
			alinhar: 'dir',
			classe: 'tabular-nums text-foreground-secondary',
			render: l =>
				l.acidentais > 0 ? (
					<>
						{fmtNum(l.acidentais)}
						<span className="ml-1 text-xs">{fmtPct(taxa(l.acidentais, l.whatsapp), 0)}</span>
					</>
				) : (
					'—'
				),
		},
		{
			chave: 'conversao',
			titulo: 'Conversão',
			filtro: 'numero',
			valor: l => l.conversao,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => <span className={corTaxa(l.conversao, mediaConversao, l.sessoes)}>{fmtPct(l.conversao)}</span>,
		},
		{
			chave: 'score',
			titulo: 'Score',
			filtro: 'numero',
			valor: l => l.score ?? -1,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l =>
				l.score === null ? (
					<span className="text-foreground-secondary">—</span>
				) : (
					<span className={`text-base font-semibold ${corTaxa(l.score, mediaScore, l.sessoes_mensuraveis)}`}>
						{fmtPct(l.score)}
						{l.sessoes_mensuraveis < VOLUME_MINIMO && (
							<span className="ml-1 text-[10px] font-normal text-foreground-secondary">poucos dados</span>
						)}
					</span>
				),
		},
		{
			chave: 'mediana',
			titulo: 'Mediana até o clique',
			filtro: 'numero',
			valor: l => l.mediana_segundos ?? -1,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => fmtDuracao(l.mediana_segundos),
		},
		{
			chave: 'viraram_card',
			titulo: 'Viraram card',
			filtro: 'numero',
			valor: l => l.viraram_card,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => fmtNum(l.viraram_card),
		},
	]

	return (
		<Secao
			titulo="Campanhas — conversão e qualidade do clique"
			dica={`Conversão é a parte das sessões que clicou no WhatsApp, SEM os cliques acidentais: sessão em que todos os cliques foram nos primeiros 3 segundos depois da chegada (quase sempre o toque seguinte ao do anúncio caindo no botão flutuante) fica na coluna Acidentais e não conta como conversão. O Score é a mesma conversão, mas cada clique vale pelo tempo que a pessoa passou no site antes de chamar: ${pesos}. Quem clica nos primeiros segundos costuma não ter pesquisado; quem navega antes chega decidido. Compare a campanha pelo Score, não só pela conversão. O horário do clique só é gravado desde ${desde}: sessões anteriores não entram no Score. 'Viraram card' são os cliques cuja conversa foi ligada a um card do CRM.`}
			acessorio={
				<span className="text-xs text-foreground-secondary text-right">
					Conversão média: <strong className="text-foreground">{fmtPct(mediaConversao)}</strong>
					<br />
					Score médio: <strong className="text-foreground">{fmtPct(mediaScore)}</strong>
				</span>
			}
		>
			<TabelaOrdenavel
				colunas={colunas}
				linhas={linhas}
				chaveLinha={l => l.chave}
				vazio="Nenhuma sessão no período."
			/>
		</Secao>
	)
}


/**
 * A tabela com seletor de período e carga própria — é o que a aba
 * Estatísticas do Marketing mostra. Lê /api/admin/visitors/campanhas, que
 * exige a mesma permissão do painel de visitantes.
 */
export function EstatisticasCampanhas() {
	const { api, link } = useVisitantesApi()
	const [dados, setDados] = useState<{ campanhas: LinhaCampanhaScore[]; score_desde: string } | null>(null)
	const [dias, setDias] = useState(30)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)

	const carregar = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const r = await fetch(api('campanhas', { dias }))
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			setDados(await r.json())
		} catch (e) {
			console.error('[Estatísticas de campanha] falha ao carregar:', e)
			setErro('Não foi possível carregar as estatísticas das campanhas.')
		} finally {
			setCarregando(false)
		}
	}, [dias, api])

	useEffect(() => {
		carregar()
	}, [carregar])

	return (
		<div className="space-y-4">
			<BarraControles
				dias={dias}
				onDias={setDias}
				carregando={carregando}
				onAtualizar={carregar}
				extra={
					<Link href={link('/origens')} className="text-sm text-primary hover:underline">
						Ver todas as origens →
					</Link>
				}
			/>
			{erro && <Erro>{erro}</Erro>}
			{dados && <TabelaCampanhasScore linhas={dados.campanhas} scoreDesde={dados.score_desde} />}
		</div>
	)
}

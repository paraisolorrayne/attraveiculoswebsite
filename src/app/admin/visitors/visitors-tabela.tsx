'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Filter, X } from 'lucide-react'
import {
	filtrarLinhas,
	opcoesDaColuna,
	ordenarLinhas,
	proximaOrdenacao,
	type Filtro,
	type Ordenacao,
	type ValorDaCelula,
} from '@/lib/visitors/tabela'
import { TD, TH, Vazio } from './visitors-ui'

/**
 * Tabela de leitura com ordenação e filtro POR COLUNA, usada por todas as
 * listas do painel de visitantes.
 *
 * Antes cada tabela tinha o próprio `<table>` escrito à mão, na ordem que o
 * servidor mandasse e sem filtro nenhum: para achar uma cidade numa lista de
 * 40, ou os canais com mais de 100 sessões, só olhando linha por linha.
 * Aqui a coluna se declara — como renderiza, que valor bruto tem, e se filtra
 * por texto, opção ou número — e o resto (cabeçalho clicável, campos de
 * filtro, contagem, "limpar") vem de graça e igual em todas as telas.
 *
 * As regras de ordenar/filtrar são puras e testadas em src/lib/visitors/tabela.ts.
 */

export interface ColunaTabela<T> {
	chave: string
	titulo: string
	/** Conteúdo da célula (JSX rico: badges, barras, links). */
	render: (linha: T) => ReactNode
	/**
	 * Valor bruto para ordenar e filtrar. Sem ele a coluna não ordena nem
	 * filtra — é o caso das colunas que só desenham (uma barra, um gráfico).
	 */
	valor?: (linha: T) => ValorDaCelula
	/** Habilita o campo de filtro desta coluna. Precisa de `valor`. */
	filtro?: 'texto' | 'opcoes' | 'numero'
	alinhar?: 'dir'
	/** Classe extra da célula (largura mínima, truncamento…). */
	classe?: string
	/** Rótulo curto para o campo de filtro, quando o título é longo. */
	rotuloFiltro?: string
}

interface Props<T> {
	colunas: ColunaTabela<T>[]
	linhas: T[]
	chaveLinha: (linha: T) => string
	/** Ordenação inicial; por padrão respeita a ordem que veio do servidor. */
	ordemInicial?: Ordenacao | null
	vazio?: string
	/** Linha inteira clicável (usado na lista de sessões). */
	aoClicarLinha?: (linha: T) => void
	/** Rodapé fixo (paginação), fora da área filtrável. */
	rodape?: ReactNode
	/** Some com a barra de controles quando a tabela é pequena demais para valer. */
	minimoParaControles?: number
	/**
	 * Modo CONTROLADO — para a lista de sessões, que é paginada no servidor.
	 *
	 * Ordenar e filtrar aqui dentro só mexeria nas 50 linhas da página aberta,
	 * e a leitora leria "as 3 sessões que converteram" quando são as 3 desta
	 * página. Quando estas props vêm, o componente não ordena nem filtra: só
	 * desenha o estado e avisa quem manda (que refaz a busca no servidor).
	 */
	controlado?: {
		ordenacao: Ordenacao | null
		aoOrdenar: (proxima: Ordenacao | null) => void
		filtros: Record<string, Filtro>
		aoFiltrar: (chave: string, patch: Partial<Filtro>) => void
		aoLimpar: () => void
		/** Total real no servidor, para a contagem não mentir. */
		totalFiltrado?: number
		totalGeral?: number
		/** Opções dos selects, já que a página atual não conhece todos os valores. */
		opcoes?: Record<string, string[]>
	}
}

export function TabelaOrdenavel<T>({
	colunas,
	linhas,
	chaveLinha,
	ordemInicial = null,
	vazio = 'Sem dados no período.',
	aoClicarLinha,
	rodape,
	minimoParaControles = 3,
	controlado,
}: Props<T>) {
	const [ordenacaoLocal, setOrdenacaoLocal] = useState<Ordenacao | null>(ordemInicial)
	const [filtrosLocais, setFiltrosLocais] = useState<Record<string, Filtro>>({})
	const [abertos, setAbertos] = useState(false)

	const ordenacao = controlado ? controlado.ordenacao : ordenacaoLocal
	const filtros = controlado ? controlado.filtros : filtrosLocais

	const porChave = useMemo(() => new Map(colunas.map(c => [c.chave, c])), [colunas])
	const valorDe = useMemo(
		() => (linha: T, chave: string): ValorDaCelula => porChave.get(chave)?.valor?.(linha) ?? null,
		[porChave],
	)

	// No modo controlado o servidor já entregou as linhas filtradas, ordenadas
	// e paginadas — refazer aqui só embaralharia a página.
	const filtradas = useMemo(
		() => (controlado ? linhas : filtrarLinhas(linhas, valorDe, filtros)),
		[controlado, linhas, valorDe, filtros],
	)
	const visiveis = useMemo(
		() => (controlado ? filtradas : ordenarLinhas(filtradas, valorDe, ordenacao)),
		[controlado, filtradas, valorDe, ordenacao],
	)

	const filtraveis = colunas.filter(c => c.filtro && c.valor)
	const ativos = Object.entries(filtros).filter(([, f]) => String(f.valor).trim() !== '')
	const mostrarControles = filtraveis.length > 0 && (controlado ? true : linhas.length >= minimoParaControles)
	const mostrarLinhaFiltros = abertos || ativos.length > 0

	const definirFiltro = (chave: string, patch: Partial<Filtro>) => {
		if (controlado) {
			controlado.aoFiltrar(chave, patch)
			return
		}
		setFiltrosLocais(atual => {
			const coluna = porChave.get(chave)
			const base: Filtro = atual[chave] ?? { tipo: coluna?.filtro ?? 'texto', valor: '', operador: 'maior' }
			return { ...atual, [chave]: { ...base, ...patch } }
		})
	}

	const ordenarPor = (chave: string) => {
		const proxima = proximaOrdenacao(ordenacao, chave)
		if (controlado) controlado.aoOrdenar(proxima)
		else setOrdenacaoLocal(proxima)
	}

	const limparFiltros = () => {
		if (controlado) controlado.aoLimpar()
		else setFiltrosLocais({})
	}

	const totalMostrado = controlado?.totalFiltrado ?? visiveis.length
	const totalGeral = controlado?.totalGeral ?? linhas.length

	return (
		<>
			{mostrarControles && (
				<div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
					<button
						type="button"
						onClick={() => setAbertos(a => !a)}
						className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
							ativos.length > 0
								? 'border-primary/50 text-foreground'
								: 'border-border text-foreground-secondary hover:text-foreground'
						}`}
						aria-expanded={mostrarLinhaFiltros}
					>
						<Filter className="w-3.5 h-3.5" />
						Filtrar
						{ativos.length > 0 && <span className="tabular-nums">({ativos.length})</span>}
					</button>
					<span className="text-xs text-foreground-secondary tabular-nums">
						{ativos.length > 0 ? (
							<>
								{totalMostrado.toLocaleString('pt-BR')} de {totalGeral.toLocaleString('pt-BR')} linhas
							</>
						) : (
							<>{totalGeral.toLocaleString('pt-BR')} linhas</>
						)}
					</span>
					{ativos.length > 0 && (
						<button type="button" onClick={limparFiltros} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
							<X className="w-3 h-3" /> limpar filtros
						</button>
					)}
					{ordenacao && (
						<button
							type="button"
							onClick={() => (controlado ? controlado.aoOrdenar(null) : setOrdenacaoLocal(null))}
							className="text-xs text-foreground-secondary hover:text-foreground"
						>
							ordem original
						</button>
					)}
				</div>
			)}

			{linhas.length === 0 ? (
				<Vazio>{vazio}</Vazio>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								{colunas.map(c => {
									const ordenavel = !!c.valor
									const ativa = ordenacao?.chave === c.chave
									return (
										<th
											key={c.chave}
											className={`${TH} ${c.alinhar === 'dir' ? 'text-right' : 'text-left'} ${ordenavel ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
											aria-sort={ativa ? (ordenacao!.direcao === 'asc' ? 'ascending' : 'descending') : undefined}
											onClick={ordenavel ? () => ordenarPor(c.chave) : undefined}
											title={ordenavel ? 'Clique para ordenar' : undefined}
										>
											<span className={`inline-flex items-center gap-1 ${c.alinhar === 'dir' ? 'flex-row-reverse' : ''}`}>
												{c.titulo}
												{ordenavel &&
													(ativa ? (
														ordenacao!.direcao === 'asc' ? (
															<ArrowUp className="w-3 h-3 text-primary" />
														) : (
															<ArrowDown className="w-3 h-3 text-primary" />
														)
													) : (
														<ChevronsUpDown className="w-3 h-3 opacity-30" />
													))}
											</span>
										</th>
									)
								})}
							</tr>
							{mostrarLinhaFiltros && (
								<tr className="border-t border-border">
									{colunas.map(c => (
										<th key={c.chave} className="px-3 py-1.5 align-top">
											{c.filtro && c.valor ? (
												<CampoFiltro
													coluna={c}
													filtro={filtros[c.chave]}
													opcoes={
														c.filtro === 'opcoes'
															? (controlado?.opcoes?.[c.chave] ?? opcoesDaColuna(linhas, valorDe, c.chave))
															: []
													}
													onChange={patch => definirFiltro(c.chave, patch)}
												/>
											) : null}
										</th>
									))}
								</tr>
							)}
						</thead>
						<tbody className="divide-y divide-border">
							{visiveis.map(linha => (
								<tr
									key={chaveLinha(linha)}
									className={`hover:bg-background-soft/60 ${aoClicarLinha ? 'cursor-pointer' : ''}`}
									onClick={aoClicarLinha ? () => aoClicarLinha(linha) : undefined}
								>
									{colunas.map(c => (
										<td key={c.chave} className={`${TD} ${c.alinhar === 'dir' ? 'text-right' : ''} ${c.classe ?? ''}`}>
											{c.render(linha)}
										</td>
									))}
								</tr>
							))}
							{visiveis.length === 0 && (
								<tr>
									<td colSpan={colunas.length} className="px-4 py-8 text-center text-sm text-foreground-secondary">
										Nenhuma linha com esses filtros.{' '}
										<button type="button" onClick={limparFiltros} className="text-primary hover:underline">
											limpar
										</button>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			)}
			{rodape}
		</>
	)
}

const CAMPO = 'w-full rounded border border-border bg-background-card px-2 py-1 text-xs font-normal text-foreground placeholder:text-foreground-secondary/70'

function CampoFiltro<T>({
	coluna,
	filtro,
	opcoes,
	onChange,
}: {
	coluna: ColunaTabela<T>
	filtro?: Filtro
	opcoes: string[]
	onChange: (patch: Partial<Filtro>) => void
}) {
	const rotulo = coluna.rotuloFiltro ?? coluna.titulo
	if (coluna.filtro === 'opcoes') {
		return (
			<select
				value={filtro?.valor ?? ''}
				onChange={e => onChange({ tipo: 'opcoes', valor: e.target.value })}
				className={CAMPO}
				aria-label={`Filtrar por ${rotulo}`}
			>
				<option value="">Todos</option>
				{opcoes.map(o => (
					<option key={o} value={o}>
						{o}
					</option>
				))}
			</select>
		)
	}
	if (coluna.filtro === 'numero') {
		return (
			<div className="flex gap-1">
				<select
					value={filtro?.operador ?? 'maior'}
					onChange={e => onChange({ tipo: 'numero', operador: e.target.value as 'maior' | 'menor' })}
					className={`${CAMPO} w-12 shrink-0 px-1`}
					aria-label={`Comparador de ${rotulo}`}
					title="Maior ou igual / menor ou igual"
				>
					<option value="maior">≥</option>
					<option value="menor">≤</option>
				</select>
				<input
					type="number"
					inputMode="decimal"
					value={filtro?.valor ?? ''}
					onChange={e => onChange({ tipo: 'numero', valor: e.target.value })}
					placeholder="0"
					className={CAMPO}
					aria-label={`Filtrar por ${rotulo}`}
				/>
			</div>
		)
	}
	return (
		<input
			type="text"
			value={filtro?.valor ?? ''}
			onChange={e => onChange({ tipo: 'texto', valor: e.target.value })}
			placeholder="filtrar…"
			className={CAMPO}
			aria-label={`Filtrar por ${rotulo}`}
		/>
	)
}

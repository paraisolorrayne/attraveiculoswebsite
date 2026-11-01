'use client'

/**
 * Os controles do Gerador de Criativos.
 *
 * O HTML mostrava e escondia `<fieldset>` por `style.display` numa função
 * `updateVisibility` de trinta linhas, longe dos campos que ela governava. Aqui
 * cada seção decide a própria presença a partir de `estado.tipo`, no lugar onde
 * ela é escrita — a regra e o campo que ela esconde ficam à mesma vista.
 */

import { useState, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'
import type {
	BlocoFicha,
	CarroEstoque,
	EstadoCriativo,
	ItemDesempenho,
	OpcoesFoto,
	PisoTipo,
	SlotFoto,
} from '@content/admin/creative/gerador'
import { RED } from '@content/admin/creative/gerador/desenho'
import type { Gerador } from './use-gerador'

/* ---------------------------------------------------------------- primitivas */

/** Sem largura: quem usa decide (no desempenho, número e unidade dividem a linha). */
const CLASSE_CAIXA =
	'rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary/60'
const CLASSE_ENTRADA = 'w-full ' + CLASSE_CAIXA

/**
 * Cada seção é um container (`@container`): as grades de dentro se arrumam
 * pela largura da SEÇÃO, não da tela. Desde 31/10/2026 o formulário tem duas
 * colunas em tela larga e a mesma seção pode ter 600 ou 1.400 px.
 */
export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
	return (
		<section className="@container rounded-lg border border-border bg-background-card p-4">
			<h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-secondary">
				{titulo}
			</h3>
			<div className="space-y-3">{children}</div>
		</section>
	)
}

export function Dica({ children }: { children: React.ReactNode }) {
	return <p className="text-xs leading-relaxed text-foreground-secondary">{children}</p>
}

export function CampoTexto({
	rotulo,
	valor,
	aoMudar,
	dica,
	...resto
}: {
	rotulo: string
	valor: string
	aoMudar: (v: string) => void
	dica?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
	return (
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-foreground-secondary">{rotulo}</span>
			<input
				type="text"
				value={valor}
				onChange={(e: ChangeEvent<HTMLInputElement>) => aoMudar(e.target.value)}
				className={CLASSE_ENTRADA}
				{...resto}
			/>
			{dica && <span className="mt-1 block text-xs text-foreground-secondary">{dica}</span>}
		</label>
	)
}

export function CampoAreaTexto({
	rotulo,
	valor,
	aoMudar,
	linhas = 3,
	placeholder,
}: {
	rotulo: string
	valor: string
	aoMudar: (v: string) => void
	linhas?: number
	placeholder?: string
}) {
	return (
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-foreground-secondary">{rotulo}</span>
			<textarea
				rows={linhas}
				value={valor}
				onChange={e => aoMudar(e.target.value)}
				placeholder={placeholder}
				className={CLASSE_ENTRADA + ' resize-y'}
			/>
		</label>
	)
}

/** Cor em #rrggbb: o seletor do navegador e o código, editáveis um pelo outro. */
export function CampoCor({
	rotulo,
	valor,
	padrao,
	aoMudar,
}: {
	rotulo: string
	valor: string
	/** O que a peça usa quando o campo está vazio. */
	padrao: string
	aoMudar: (v: string) => void
}) {
	const valida = /^#[0-9a-f]{6}$/i.test(valor)
	return (
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-foreground-secondary">{rotulo}</span>
			<div className="flex items-center gap-2">
				<input
					type="color"
					value={valida ? valor : padrao}
					onChange={e => aoMudar(e.target.value)}
					className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
				/>
				<input
					type="text"
					value={valor}
					onChange={e => aoMudar(e.target.value.trim())}
					placeholder={padrao}
					className={CLASSE_ENTRADA + ' font-mono'}
				/>
			</div>
		</label>
	)
}

export function CampoFaixa({
	rotulo,
	valor,
	min,
	max,
	aoMudar,
}: {
	rotulo: string
	valor: number
	min: number
	max: number
	aoMudar: (v: number) => void
}) {
	return (
		<label className="block">
			<span className="mb-1 flex items-center justify-between text-xs font-medium text-foreground-secondary">
				{rotulo}
				<span className="tabular-nums text-foreground-secondary/70">{valor}</span>
			</span>
			<input
				type="range"
				min={min}
				max={max}
				value={valor}
				onChange={e => aoMudar(Number(e.target.value))}
				className="w-full accent-primary"
			/>
		</label>
	)
}

/**
 * Arquivo do computador. O <input type="file"> do navegador saía em inglês
 * ("Choose File · No file chosen") e não dizia qual foto já estava na peça:
 * agora é um botão em português com o nome do último arquivo escolhido.
 */
export function CampoArquivo({
	rotulo,
	aceita = 'image/*',
	aoEscolher,
}: {
	rotulo: string
	aceita?: string
	aoEscolher: (f: File) => void
}) {
	const [nome, setNome] = useState<string | null>(null)
	return (
		<label className="block cursor-pointer">
			<span className="mb-1 block text-xs font-medium text-foreground-secondary">{rotulo}</span>
			<span className="flex items-center gap-2.5 rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm transition-colors hover:border-foreground-secondary">
				<Upload className="h-4 w-4 shrink-0 text-foreground-secondary" aria-hidden="true" />
				<span className={'truncate ' + (nome ? 'text-foreground' : 'text-foreground-secondary')}>
					{nome ?? 'Escolher do computador'}
				</span>
			</span>
			<input
				type="file"
				accept={aceita}
				onChange={e => {
					const f = e.target.files?.[0]
					if (f) {
						setNome(f.name)
						aoEscolher(f)
					}
					e.target.value = '' // permite reenviar o MESMO arquivo
				}}
				className="sr-only"
			/>
		</label>
	)
}

/** Botões que se comportam como um grupo de rádio (formato, piso, destino). */
export function Escolha<T extends string>({
	opcoes,
	valor,
	aoEscolher,
}: {
	opcoes: { id: T; nome: string; descricao?: string }[]
	valor: T
	aoEscolher: (v: T) => void
}) {
	// Os quatro formatos cabem numa fileira quando a seção é larga.
	return (
		<div className={'grid grid-cols-2 gap-2 ' + (opcoes.length >= 4 ? '@2xl:grid-cols-4' : '@md:grid-cols-3')}>
			{opcoes.map(o => (
				<button
					key={o.id}
					type="button"
					onClick={() => aoEscolher(o.id)}
					aria-pressed={valor === o.id}
					className={
						'rounded-md border px-3 py-2 text-left text-xs transition-colors ' +
						(valor === o.id
							? 'border-primary bg-primary/10 text-foreground'
							: 'border-border text-foreground-secondary hover:bg-background-soft')
					}
				>
					<span className="block font-medium">{o.nome}</span>
					{o.descricao && <span className="block text-[0.6875rem] opacity-70">{o.descricao}</span>}
				</button>
			))}
		</div>
	)
}

/* --------------------------------------------------- enquadramento de 1 foto */

/** Zoom mínimo e máximo, em %. */
const LIMITES_ZOOM: [number, number] = [55, 250]

export function Enquadramento({
	opcoes,
	aoMudar,
}: {
	opcoes: OpcoesFoto
	aoMudar: (o: OpcoesFoto) => void
}) {
	const [min, max] = LIMITES_ZOOM
	return (
		<div className="grid grid-cols-3 gap-3">
			<CampoFaixa
				rotulo="Zoom"
				min={min}
				max={max}
				valor={Math.round(opcoes.zoom * 100)}
				aoMudar={v => aoMudar({ ...opcoes, zoom: v / 100 })}
			/>
			{/* Mexer na POSIÇÃO não mexe no zoom. Havia aqui um "zoom mínimo" que
			    subia para 112% assim que o operador arrastava a posição, com a
			    premissa falsa de que sem zoom não sobrava o que deslocar: o cálculo
			    do curso garante 60% da caixa mesmo com a foto cabendo exata. No
			    Clássico o efeito era comer a margem em volta do carro sem ninguém
			    ter pedido ampliação. */}
			<CampoFaixa
				rotulo="Posição ↔"
				min={0}
				max={100}
				valor={Math.round(opcoes.x * 100)}
				aoMudar={v => aoMudar({ ...opcoes, x: v / 100 })}
			/>
			<CampoFaixa
				rotulo="Posição ↕"
				min={0}
				max={100}
				valor={Math.round(opcoes.y * 100)}
				aoMudar={v => aoMudar({ ...opcoes, y: v / 100 })}
			/>
		</div>
	)
}

/* ------------------------------------------------------------ carro da lista */

function CarroDaLista({
	indice,
	carro,
	aoMudar,
	aoEscolherFoto,
}: {
	indice: number
	carro: CarroEstoque
	aoMudar: (c: CarroEstoque) => void
	aoEscolherFoto: (f: File) => void
}) {
	return (
		<div className="@container rounded-md border border-border p-3">
			<h4 className="mb-2 text-xs font-semibold text-foreground">CARRO {indice + 1}</h4>
			<div className="space-y-2">
				<CampoTexto rotulo="Nome" valor={carro.nome} aoMudar={v => aoMudar({ ...carro, nome: v })} />
				<div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
					<CampoTexto rotulo="Ano" valor={carro.ano} aoMudar={v => aoMudar({ ...carro, ano: v })} />
					<CampoTexto rotulo="KM" valor={carro.km} aoMudar={v => aoMudar({ ...carro, km: v })} />
					<CampoTexto rotulo="Preço" valor={carro.preco} aoMudar={v => aoMudar({ ...carro, preco: v })} />
					<CampoTexto
						rotulo="Selo (opcional)"
						valor={carro.tag}
						aoMudar={v => aoMudar({ ...carro, tag: v })}
					/>
				</div>
				<CampoArquivo rotulo="Foto" aoEscolher={aoEscolherFoto} />
			</div>
		</div>
	)
}

/* ------------------------------------------------------------ Premium */

/** As unidades de sempre, sugeridas no campo (ainda dá para digitar outra). */
const UNIDADES = ['cv', 'kgfm', 's', 'km/h', 'Nm']

/** Logotipo do modelo: é imagem, fica na coluna das fotos. */
function LogotipoDoModelo({ g, aoEscolherLogoModelo }: { g: Gerador; aoEscolherLogoModelo: (f: File) => void }) {
	return (
		<Secao titulo="Logotipo do modelo">
			<CampoArquivo rotulo="PNG transparente" aceita="image/png" aoEscolher={aoEscolherLogoModelo} />
			<Dica>
				O logotipo do fabricante (o “TEMERARIO” cromado, por exemplo) entra no lugar do nome do
				modelo. Sem ele, o nome sai escrito em itálico cromado.
			</Dica>
			{g.imagens.current.logoModelo && (
				<button
					type="button"
					onClick={() => g.definirLogoModelo(null)}
					className="rounded-md border border-border px-3 py-2 text-xs text-foreground-secondary hover:bg-background-soft"
				>
					Tirar o logotipo e voltar ao nome escrito
				</button>
			)}
		</Secao>
	)
}

/** Um bloco da ficha do Premium: o rótulo é o cabeçalho do cartão, o texto embaixo. */
function BlocoDaFicha({ bloco, aoMudar }: { bloco: BlocoFicha; aoMudar: (b: BlocoFicha) => void }) {
	return (
		<div className="flex flex-col gap-2 rounded-md border border-border bg-background p-2.5">
			<input
				aria-label="Rótulo do bloco"
				value={bloco.rotulo}
				onChange={e => aoMudar({ ...bloco, rotulo: e.target.value })}
				placeholder="RÓTULO"
				className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold uppercase tracking-wider text-foreground-secondary placeholder:text-foreground-secondary/50 hover:border-border focus:border-border"
			/>
			<textarea
				aria-label={`Texto de ${bloco.rotulo || 'bloco'}`}
				rows={3}
				value={bloco.texto}
				onChange={e => aoMudar({ ...bloco, texto: e.target.value })}
				placeholder="Uma informação por linha"
				className={CLASSE_ENTRADA + ' resize-y'}
			/>
		</div>
	)
}

function CamposPremium({ g }: { g: Gerador }) {
	const { estado, campo } = g
	const desempenho = estado.desempenho ?? []
	const blocos = estado.blocos ?? []
	const mudarItem = (i: number, novo: ItemDesempenho) =>
		campo('desempenho', desempenho.map((x, j) => (j === i ? novo : x)))
	const mudarBloco = (i: number, novo: BlocoFicha) =>
		campo('blocos', blocos.map((x, j) => (j === i ? novo : x)))
	const bloco = (i: number) =>
		blocos[i] ? <BlocoDaFicha key={i} bloco={blocos[i]} aoMudar={b => mudarBloco(i, b)} /> : null

	return (
		<>
			<Secao titulo="Cor do carro">
				<div className="grid gap-3 @lg:grid-cols-2">
					<CampoTexto
						rotulo="Nome da cor (vai na faixa, com o ano)"
						valor={estado.nomeCor ?? ''}
						aoMudar={v => campo('nomeCor', v)}
						placeholder="Ex.: VIOLA PASIFAE"
					/>
					<CampoCor
						rotulo="Cor de destaque"
						valor={estado.corDestaque ?? ''}
						padrao={RED}
						aoMudar={v => campo('corDestaque', v)}
					/>
				</div>
				<Dica>
					A faixa usa a cor como está; os rótulos usam a mesma cor clareada para ler no fundo
					escuro. Vazio = vermelho da Attra, que é o que serve para carro preto, branco ou cinza.
				</Dica>
			</Secao>

			{/* Os quatro números como saem na peça: número grande, unidade ao lado,
			    legenda embaixo. Antes eram quatro linhas de "Número / Unidade /
			    Legenda" repetidos, da largura da tela. */}
			<Secao titulo="Desempenho (até 4)">
				<div className="grid grid-cols-2 gap-2.5 @2xl:grid-cols-4">
					{desempenho.map((it, i) => (
						<div key={i} className="space-y-2 rounded-md border border-border bg-background p-2.5">
							<div className="flex gap-1.5">
								<input
									aria-label={`Número ${i + 1}`}
									value={it.valor}
									onChange={e => mudarItem(i, { ...it, valor: e.target.value })}
									placeholder="920"
									inputMode="decimal"
									className={CLASSE_CAIXA + ' min-w-0 flex-1 text-lg font-semibold tabular-nums'}
								/>
								<input
									aria-label={`Unidade ${i + 1}`}
									list="gerador-unidades"
									value={it.unidade}
									onChange={e => mudarItem(i, { ...it, unidade: e.target.value })}
									placeholder="cv"
									className={CLASSE_CAIXA + ' w-[5.5rem] shrink-0 px-2'}
								/>
							</div>
							<input
								aria-label={`Legenda ${i + 1}`}
								value={it.rotulo}
								onChange={e => mudarItem(i, { ...it, rotulo: e.target.value })}
								placeholder="POTÊNCIA"
								className={CLASSE_ENTRADA + ' text-xs uppercase tracking-wider'}
							/>
						</div>
					))}
				</div>
				<datalist id="gerador-unidades">
					{UNIDADES.map(u => (
						<option key={u} value={u} />
					))}
				</datalist>
				<Dica>Número vazio tira o item da linha; os outros se recentralizam sozinhos.</Dica>
			</Secao>

			{/* A grade na mesma disposição da peça: três em cima; embaixo, a casa da
			    esquerda é livre (é por onde passa a diagonal da foto de baixo). */}
			<Secao titulo="Ficha (5 blocos)">
				<div className="grid gap-2.5 @xl:grid-cols-3">
					{bloco(0)}
					{bloco(1)}
					{bloco(2)}
					<div className="hidden items-center justify-center rounded-md border border-dashed border-border p-3 text-center text-xs leading-relaxed text-foreground-secondary @xl:flex">
						Livre: por aqui passa a diagonal da foto de baixo
					</div>
					{bloco(3)}
					{bloco(4)}
				</div>
				<Dica>
					Uma informação por linha, até três: a primeira sai em branco e as outras um tom abaixo.
				</Dica>
			</Secao>
		</>
	)
}

/* --------------------------------------------------------------- o painel */

const PISOS: { id: PisoTipo; nome: string; descricao: string }[] = [
	{ id: 'concreto', nome: 'Concreto', descricao: 'piso claro real' },
	{ id: 'asfalto', nome: 'Asfalto', descricao: 'piso escuro real' },
]

/**
 * Os campos do formato escolhido, em duas partes que a tela põe lado a lado em
 * tela larga: `conteudo` (o que se escreve na peça) e `imagem` (fotos,
 * enquadramento e logotipo do modelo).
 */
export function PainelCampos({
	g,
	parte,
	aoEscolherFotoDoComputador,
	aoEscolherFotoDaLista,
	aoEscolherLogoModelo,
}: {
	g: Gerador
	parte: 'conteudo' | 'imagem'
	aoEscolherFotoDoComputador: (slot: SlotFoto, f: File) => void
	aoEscolherFotoDaLista: (indice: number, f: File) => void
	aoEscolherLogoModelo: (f: File) => void
}) {
	const { estado, campo } = g
	const t = estado.tipo
	const classicoLoja = t === 'classico-loja'
	const edicao = t === 'edicao'
	const texto = <K extends keyof EstadoCriativo>(k: K) => (v: string) =>
		campo(k, v as EstadoCriativo[K])

	if (parte === 'imagem') {
		if (t === 'estoque') return null
		return (
			<>
				<Secao titulo="Fotos">
					<div className="space-y-3 rounded-md border border-border bg-background p-3">
						<CampoArquivo
							rotulo="Foto principal (frente / 3-4)"
							aoEscolher={f => aoEscolherFotoDoComputador('foto1', f)}
						/>
						<Enquadramento opcoes={estado.f1} aoMudar={o => campo('f1', o)} />
					</div>
					<Dica>
						{edicao
							? 'A foto entra inteira e ocupa a peça toda. Prefira uma foto sem tarja ou texto aplicado: na Edição esse tipo de informação vai na ficha.'
							: 'A foto entra inteira — não precisa recortar o fundo. No Clássico Loja, o bloco de preço acompanha a base da foto: mover a posição ↕ move o texto junto, e o carro nunca é cortado nem esmaecido.'}
					</Dica>

					{/* A Edição usa só a foto principal. */}
					{!edicao && (
						<div className="space-y-3 rounded-md border border-border bg-background p-3">
							<CampoArquivo
								rotulo="Foto secundária (traseira / lateral — rodapé)"
								aoEscolher={f => aoEscolherFotoDoComputador('foto2', f)}
							/>
							<Enquadramento opcoes={estado.f2} aoMudar={o => campo('f2', o)} />
						</div>
					)}

					{classicoLoja && (
						<div className="space-y-3 rounded-md border border-border bg-background p-3">
							<div>
								<span className="mb-1 block text-xs font-medium text-foreground-secondary">
									Fundo da área de texto (Clássico)
								</span>
								<Escolha
									opcoes={PISOS}
									valor={estado.pisoTipo}
									aoEscolher={v => campo('pisoTipo', v)}
								/>
							</div>
							<div className="grid gap-3 @lg:grid-cols-2">
								<CampoFaixa
									rotulo="Posição do piso (altura)"
									min={-60}
									max={160}
									valor={estado.pisoy}
									aoMudar={v => campo('pisoy', v)}
								/>
								<CampoFaixa
									rotulo="Altura do corte transversal"
									min={-160}
									max={200}
									valor={estado.corte}
									aoMudar={v => campo('corte', v)}
								/>
							</div>
							<Dica>
								Piso: desça até a divisa ficar abaixo do veículo — a fusão nunca deve cobrir o carro; o
								preço e os destaques acompanham. Corte: para a direita em carros ALTOS (mais área de
								foto), para a esquerda em carros baixos (mais espaço para os destaques).
							</Dica>
						</div>
					)}
				</Secao>

				{t === 'premium' && <LogotipoDoModelo g={g} aoEscolherLogoModelo={aoEscolherLogoModelo} />}
			</>
		)
	}

	return (
		<>
			{t !== 'estoque' && (
				<Secao titulo="Veículo">
					<div className="grid gap-3 @lg:grid-cols-[2fr_3fr_1fr]">
						<CampoTexto rotulo="Marca" valor={estado.marca} aoMudar={texto('marca')} />
						<CampoTexto rotulo="Modelo" valor={estado.modelo} aoMudar={texto('modelo')} />
						<CampoTexto rotulo="Ano" valor={estado.ano} aoMudar={texto('ano')} />
					</div>
					<div className="grid gap-3 @lg:grid-cols-[1fr_1fr_2fr]">
						<CampoTexto
							rotulo="Preço (só números)"
							valor={estado.preco}
							aoMudar={texto('preco')}
							inputMode="numeric"
						/>
						<CampoTexto rotulo="Quilometragem" valor={estado.km} aoMudar={texto('km')} inputMode="numeric" />
						{(classicoLoja || t === 'premium' || edicao) && (
							<CampoTexto
								rotulo="Complemento da linha do KM (opcional)"
								valor={estado.kmextra}
								aoMudar={texto('kmextra')}
								placeholder="Ex.: VEÍCULO COLECIONÁVEL"
							/>
						)}
					</div>
				</Secao>
			)}

			{classicoLoja && (
				<Secao titulo="Destaques (até 3, uma linha cada)">
					<CampoTexto rotulo="Destaque 1" valor={estado.b1} aoMudar={texto('b1')} />
					<CampoTexto rotulo="Destaque 2" valor={estado.b2} aoMudar={texto('b2')} />
					<CampoTexto rotulo="Destaque 3" valor={estado.b3} aoMudar={texto('b3')} />
					<Dica>
						Deixe em branco para omitir. Cada destaque ocupa UMA linha — a fonte encolhe até caber
						e, se ainda passar, corta com “…”. Seja direto.
					</Dica>
				</Secao>
			)}

			{edicao && (
				<Secao titulo="Ficha (até 3 linhas)">
					<CampoTexto rotulo="Linha 1 — em destaque (ex.: motor)" valor={estado.b1} aoMudar={texto('b1')} />
					<CampoTexto rotulo="Linha 2" valor={estado.b2} aoMudar={texto('b2')} />
					<CampoTexto rotulo="Linha 3 (só no Stories)" valor={estado.b3} aoMudar={texto('b3')} />
					<Dica>
						A primeira linha sai maior e em branco; as outras, em cinza. Uma linha cada: o que passar é
						cortado com “…”. Informação como blindagem ou PPF vai aqui, não em tarja na foto.
					</Dica>
				</Secao>
			)}

			{t === 'premium' && <CamposPremium g={g} />}

			{t === 'estoque' && (
				<Secao titulo="Lista de carros (até 4)">
					<div className="grid gap-3 @lg:grid-cols-2">
						<CampoTexto rotulo="Título — linha 1" valor={estado.et1} aoMudar={texto('et1')} />
						<CampoTexto
							rotulo="Título — linha 2 (vermelho)"
							valor={estado.et2}
							aoMudar={texto('et2')}
						/>
					</div>
					<div className="grid gap-3 @3xl:grid-cols-2">
						{estado.estoque.map((c, i) => (
							<CarroDaLista
								key={i}
								indice={i}
								carro={c}
								aoMudar={novo =>
									campo(
										'estoque',
										estado.estoque.map((x, j) => (j === i ? novo : x)),
									)
								}
								aoEscolherFoto={f => aoEscolherFotoDaLista(i, f)}
							/>
						))}
					</div>
					<Dica>
						Carros sem nome e sem foto são omitidos; o espaçamento se ajusta sozinho. As fotos
						entram inteiras nos cards — sem recorte de fundo.
					</Dica>
				</Secao>
			)}
		</>
	)
}

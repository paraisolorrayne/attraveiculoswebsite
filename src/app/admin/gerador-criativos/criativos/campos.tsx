'use client'

/**
 * Os controles do Gerador de Criativos.
 *
 * O HTML mostrava e escondia `<fieldset>` por `style.display` numa função
 * `updateVisibility` de trinta linhas, longe dos campos que ela governava. Aqui
 * cada seção decide a própria presença a partir de `estado.tipo`, no lugar onde
 * ela é escrita — a regra e o campo que ela esconde ficam à mesma vista.
 */

import type { ChangeEvent } from 'react'
import type { CarroEstoque, EstadoCriativo, OpcoesFoto, PisoTipo } from '@content/admin/creative/gerador'
import type { Gerador } from './use-gerador'

/* ---------------------------------------------------------------- primitivas */

const CLASSE_ENTRADA =
	'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-secondary/60'

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
	return (
		<section className="rounded-lg border border-border bg-background-card p-4">
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

export function CampoArquivo({
	rotulo,
	aceita = 'image/*',
	aoEscolher,
}: {
	rotulo: string
	aceita?: string
	aoEscolher: (f: File) => void
}) {
	return (
		<label className="block">
			<span className="mb-1 block text-xs font-medium text-foreground-secondary">{rotulo}</span>
			<input
				type="file"
				accept={aceita}
				onChange={e => {
					const f = e.target.files?.[0]
					if (f) aoEscolher(f)
					e.target.value = '' // permite reenviar o MESMO arquivo
				}}
				className="block w-full text-xs text-foreground-secondary file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:text-foreground"
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
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
					{o.descricao && <span className="block text-[11px] opacity-70">{o.descricao}</span>}
				</button>
			))}
		</div>
	)
}

/* --------------------------------------------------- enquadramento de 1 foto */

const LIMITES_ZOOM: Record<'f1' | 'f2' | 'f3' | 'f4', [number, number]> = {
	f1: [55, 250],
	f2: [55, 250],
	// As fotos de detalhe nunca reduzem: elas preenchem uma tira estreita, e
	// abaixo de 100 sobrava fundo dentro da moldura.
	f3: [100, 250],
	f4: [100, 250],
}

export function Enquadramento({
	slot,
	opcoes,
	aoMudar,
}: {
	slot: 'f1' | 'f2' | 'f3' | 'f4'
	opcoes: OpcoesFoto
	aoMudar: (o: OpcoesFoto) => void
}) {
	const [min, max] = LIMITES_ZOOM[slot]
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
		<div className="rounded-md border border-border p-3">
			<h4 className="mb-2 text-xs font-semibold text-foreground">CARRO {indice + 1}</h4>
			<div className="space-y-2">
				<CampoTexto rotulo="Nome" valor={carro.nome} aoMudar={v => aoMudar({ ...carro, nome: v })} />
				<div className="grid grid-cols-2 gap-2">
					<CampoTexto rotulo="Ano" valor={carro.ano} aoMudar={v => aoMudar({ ...carro, ano: v })} />
					<CampoTexto rotulo="KM" valor={carro.km} aoMudar={v => aoMudar({ ...carro, km: v })} />
				</div>
				<div className="grid grid-cols-2 gap-2">
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

/* --------------------------------------------------------------- o painel */

const PISOS: { id: PisoTipo; nome: string; descricao: string }[] = [
	{ id: 'concreto', nome: 'Concreto', descricao: 'piso claro real' },
	{ id: 'asfalto', nome: 'Asfalto', descricao: 'piso escuro real' },
]

export function PainelCampos({
	g,
	aoEscolherFotoDoComputador,
	aoEscolherFotoDaLista,
}: {
	g: Gerador
	aoEscolherFotoDoComputador: (slot: 'foto1' | 'foto2' | 'foto3' | 'foto4', f: File) => void
	aoEscolherFotoDaLista: (indice: number, f: File) => void
}) {
	const { estado, campo } = g
	const t = estado.tipo
	// Os DOIS Clássicos compartilham o formulário: marca, destaques, corte e piso
	// valem para ambos. O que os separa é o RECORTE — o Clássico original é
	// anterior a ele e seu desenho nunca lê foto1Cut, então oferecer os controles
	// de recorte ali seria um botão sem efeito.
	const classico = t === 'classico' || t === 'classico-loja'
	const texto = <K extends keyof EstadoCriativo>(k: K) => (v: string) =>
		campo(k, v as EstadoCriativo[K])

	return (
		<>
			{t !== 'estoque' && (
				<Secao titulo="Veículo">
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto rotulo="Marca" valor={estado.marca} aoMudar={texto('marca')} />
						<CampoTexto rotulo="Ano" valor={estado.ano} aoMudar={texto('ano')} />
					</div>
					<CampoTexto rotulo="Modelo" valor={estado.modelo} aoMudar={texto('modelo')} />
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto
							rotulo="Preço (só números)"
							valor={estado.preco}
							aoMudar={texto('preco')}
						/>
						<CampoTexto rotulo="Quilometragem" valor={estado.km} aoMudar={texto('km')} />
					</div>
					{classico && (
						<CampoTexto
							rotulo="Complemento da linha do KM (opcional)"
							valor={estado.kmextra}
							aoMudar={texto('kmextra')}
							placeholder="Ex.: VEÍCULO COLECIONÁVEL"
						/>
					)}
				</Secao>
			)}

			{classico && (
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

			{t === 'ficha' && (
				<Secao titulo="Ficha do veículo">
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto
							rotulo="Rótulo da 1ª linha"
							valor={estado.rot1}
							aoMudar={texto('rot1')}
							placeholder="Ex.: EXTERIOR"
						/>
						<CampoTexto
							rotulo="Conteúdo da 1ª linha"
							valor={estado.corext}
							aoMudar={texto('corext')}
							placeholder="Ex.: BLU ELETTRICO"
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto
							rotulo="Rótulo da 2ª linha"
							valor={estado.rot2}
							aoMudar={texto('rot2')}
							placeholder="Ex.: INTERIOR"
						/>
						<CampoTexto
							rotulo="Conteúdo da 2ª linha"
							valor={estado.corint}
							aoMudar={texto('corint')}
							placeholder="Ex.: CUOIO"
						/>
					</div>
					<Dica>
						As duas linhas não precisam ser cor: sirvam para o que a peça pedir (BLINDAGEM, MOTOR,
						PROCEDÊNCIA…). Rótulo vazio mostra só o conteúdo, sem os dois-pontos; conteúdo vazio
						some com a linha inteira.
					</Dica>
					<CampoTexto
						rotulo="Selo do rodapé (garantia, programa)"
						valor={estado.garantia}
						aoMudar={texto('garantia')}
						placeholder="Ex.: 2 ANOS DE GARANTIA"
					/>
				</Secao>
			)}

			{t === 'destaque' && (
				<Secao titulo="Diferenciais do carro">
					<CampoTexto
						rotulo="Separe por vírgula (viram pílulas vermelhas)"
						valor={estado.selo}
						aoMudar={texto('selo')}
						placeholder="Ex.: 7 LUGARES, BLINDADO, ZERO KM, FULL PPF"
					/>
					<Dica>Até 4 diferenciais. O tamanho das pílulas se ajusta sozinho para caber na largura.</Dica>
				</Secao>
			)}

			{t !== 'estoque' && (
				<Secao titulo="Fotos">
					<CampoArquivo
						rotulo="Foto principal (frente / 3-4)"
						aoEscolher={f => aoEscolherFotoDoComputador('foto1', f)}
					/>
					<Enquadramento slot="f1" opcoes={estado.f1} aoMudar={o => campo('f1', o)} />
					<Dica>
						A foto entra inteira — não precisa recortar o fundo. No Clássico, o bloco de preço
						acompanha a base da foto: mover a posição ↕ move o texto junto, e o carro nunca é
						cortado nem esmaecido.
					</Dica>

					<CampoArquivo
						rotulo={
							t === 'destaque'
								? 'Foto de baixo 1 (interior / detalhe)'
								: 'Foto secundária (traseira / lateral — rodapé)'
						}
						aoEscolher={f => aoEscolherFotoDoComputador('foto2', f)}
					/>
					<Enquadramento slot="f2" opcoes={estado.f2} aoMudar={o => campo('f2', o)} />

					{classico && (
						<>
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
							<CampoFaixa
								rotulo="Posição do piso (altura)"
								min={-60}
								max={160}
								valor={estado.pisoy}
								aoMudar={v => campo('pisoy', v)}
							/>
							<Dica>
								Desça o piso até a divisa ficar abaixo do veículo — a fusão nunca deve cobrir o
								carro. O preço e os destaques acompanham.
							</Dica>
							<CampoFaixa
								rotulo="Altura do corte transversal (Clássico)"
								min={-160}
								max={200}
								valor={estado.corte}
								aoMudar={v => campo('corte', v)}
							/>
							<Dica>
								Arraste pra direita em carros ALTOS (mais área de foto); pra esquerda em carros
								baixos (mais espaço pros destaques).
							</Dica>
						</>
					)}

					{(t === 'destaque' || t === 'ficha') && (
						<>
							<CampoArquivo
								rotulo="Foto de baixo 2 (Detalhe 2 na Ficha)"
								aoEscolher={f => aoEscolherFotoDoComputador('foto3', f)}
							/>
							<Enquadramento slot="f3" opcoes={estado.f3} aoMudar={o => campo('f3', o)} />
							{/* A Ficha usa DUAS fotos na tira. Deixar a terceira no formulário só
							    produzia um campo que não aparece em lugar nenhum da peça. */}
							{t !== 'ficha' && (
								<>
									<CampoArquivo
										rotulo="Foto de baixo 3 (opcional)"
										aoEscolher={f => aoEscolherFotoDoComputador('foto4', f)}
									/>
									<Enquadramento slot="f4" opcoes={estado.f4} aoMudar={o => campo('f4', o)} />
								</>
							)}
							<Dica>
								No Destaque, com 1 foto o rodapé fica inteiro e com 3 vira uma tríade. Na Ficha
								são duas na tira do topo — a posição e o zoom escolhem o trecho de cada uma.
							</Dica>
						</>
					)}
				</Secao>
			)}

			{t === 'estoque' && (
				<Secao titulo="Lista de carros (até 4)">
					<div className="grid grid-cols-2 gap-3">
						<CampoTexto rotulo="Título — linha 1" valor={estado.et1} aoMudar={texto('et1')} />
						<CampoTexto
							rotulo="Título — linha 2 (vermelho)"
							valor={estado.et2}
							aoMudar={texto('et2')}
						/>
					</div>
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
					<Dica>
						Carros sem nome e sem foto são omitidos; o espaçamento se ajusta sozinho. As fotos
						entram inteiras nos cards — sem recorte de fundo.
					</Dica>
				</Secao>
			)}
		</>
	)
}

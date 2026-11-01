/**
 * A ficha que o marketing escreve na AutoConf, para o Gerador e o Dossiê.
 *
 * A busca do estoque (`/api/vehicles?search=`) devolve a lista da AutoConf, que
 * não traz a "Descrição Customizada para o Site". A ficha só vem com o carro
 * aberto pelo id (`/api/vehicles/{id}` → `data.ficha`), já lida sem IA e
 * filtrada por src/lib/ficha-do-anuncio.ts (sem garantia, procedência, preço
 * ou contato). Em 31/10/2026, 17 dos 68 carros tinham a ficha; nos outros ela
 * vem `null` e o preenchimento segue só com o cadastro, como antes.
 */

import type { FichaDoAnuncio } from '@/lib/ficha-do-anuncio'

export type { FichaDoAnuncio }

/** A ficha do carro, ou null: sem o molde, API fora do ar ou mais de 5 s. */
export async function buscarFicha(id: string): Promise<FichaDoAnuncio | null> {
	try {
		const r = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(5000) })
		if (!r.ok) return null
		const j = await r.json()
		return (j?.data?.ficha as FichaDoAnuncio | null | undefined) ?? null
	} catch {
		return null
	}
}

/** "62,2 kgfm" → "62,2"; "541 cv" → "541". A unidade tem campo próprio no gerador. */
export const numeroDa = (valor: string | null | undefined) => valor?.match(/^\s*(\d[\d.,]*)/)?.[1] ?? ''

/** "4.0 V8 Biturbo Híbrido (3 Motores Elétricos)" → "4.0 V8 Biturbo Híbrido": cabe numa linha. */
export const semParenteses = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim()

/** Motor e potência numa linha só: "6.5 V12 Aspirado · 800 cv". */
export const motorComPotencia = (f: FichaDoAnuncio) =>
	[f.motor && semParenteses(f.motor), f.potencia].filter(Boolean).join(' · ')

/** Diferenciais antes dos opcionais: são o que o marketing escolheu destacar. */
export const destaquesDa = (f: FichaDoAnuncio) => [...f.diferenciais, ...f.opcionais]

// A ficha traz tudo numa lista só ("Escape Full" ao lado de "Película PPF
// Full"), e o dossiê separa em três grupos. Freio, suspensão e escape são de
// performance antes de serem de carbono: por isso PERFORMANCE é testado primeiro.
const PERFORMANCE = /suspens|freio|escap|tra[çc][ãa]o|calibra|velocidade|aerodin|launch|pneu/i
const ACABAMENTO = /pintura|ppf|pel[íi]cula|carbono|alc[âa]ntara|couro|bordad|costura|soleira|lanterna|roda|volante|acabamento|detalhes|teto interno/i

export type GrupoDoDossie = 'acabamento' | 'conforto' | 'performance'

/**
 * Os itens da ficha nos três grupos de diferenciais do dossiê: cor, interior e
 * rodas abrem COR & ACABAMENTO, o som abre CONFORTO & TECNOLOGIA e os freios
 * abrem PERFORMANCE & CONDUÇÃO; o resto vai por palavra-chave, e o que não se
 * encaixa em nenhum fica em conforto. O operador confere antes de imprimir.
 * O rótulo vai entre **asteriscos**, que o documento põe em negrito, como no
 * dossiê original ("**Pintura Exclusiva** Podium Green").
 */
export function gruposDoDossie(f: FichaDoAnuncio): Record<GrupoDoDossie, string[]> {
	const comRotulo = (rotulo: string, valor: string | null) => (valor ? [`**${rotulo}** ${valor}`] : [])
	const grupos: Record<GrupoDoDossie, string[]> = {
		acabamento: [...comRotulo('Pintura', f.cor), ...comRotulo('Interior', f.interior), ...comRotulo('Rodas', f.rodas)],
		conforto: comRotulo('Som', f.som),
		performance: comRotulo('Freios', f.freios),
	}
	for (const item of destaquesDa(f)) {
		if (PERFORMANCE.test(item)) grupos.performance.push(item)
		else if (ACABAMENTO.test(item)) grupos.acabamento.push(item)
		else grupos.conforto.push(item)
	}
	return grupos
}

/** Qual grupo do dossiê é este, pelo título ("COR & ACABAMENTO" → acabamento). */
export function grupoPeloTitulo(titulo: string): GrupoDoDossie | null {
	if (/ACABAMENTO/i.test(titulo)) return 'acabamento'
	if (/CONFORTO|TECNOLOGIA/i.test(titulo)) return 'conforto'
	if (/PERFORMANCE|CONDU/i.test(titulo)) return 'performance'
	return null
}

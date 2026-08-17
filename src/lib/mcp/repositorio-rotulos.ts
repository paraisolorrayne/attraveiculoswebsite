import { sql } from 'kysely'
import { db } from '@/lib/db'
import { VOCABULARIO, type Rotulos, type RotuloUso, type RotuloComprador, type RotuloForca } from '@/lib/mcp/rotulos'

const USO_VALIDOS = new Set<string>(VOCABULARIO.uso)
const COMPRADOR_VALIDOS = new Set<string>(VOCABULARIO.comprador)
const FORCA_VALIDOS = new Set<string>(VOCABULARIO.forca)

/**
 * Filtra `valor` (o que veio cru do banco) contra o vocabulário fechado.
 *
 * O vocabulário é fechado só de nome se a LEITURA não fizer valer isso. A
 * tela de admin ficou fora de escopo, então a correção da Attra hoje é
 * `UPDATE` na mão — um rótulo digitado errado (typo, rótulo de outro eixo,
 * valor legado) entrava direto no texto indexado, porque `legivel()` cai no
 * fallback `?? r` e vaza o slug cru quando não reconhece. Descartar aqui,
 * silenciosamente, é melhor que indexar lixo: um rótulo a menos não afirma
 * nada de errado sobre o carro.
 */
function filtrarValidos<T extends string>(valor: unknown, validos: ReadonlySet<string>): T[] {
	if (!Array.isArray(valor)) return []
	return valor.filter((v): v is T => typeof v === 'string' && validos.has(v))
}

export interface RotulosGravados extends Rotulos {
	prosa: string | null
	sobrescritoPor: string | null
}

/**
 * Sobrescrita humana vence a regra, sempre.
 *
 * É o motivo de esta tabela existir separada de `vehicle_embeddings`: se a
 * ressincronização noturna apagasse a correção da Attra, o trabalho manual
 * sumiria toda madrugada e ninguém saberia por quê.
 */
export function mesclar(derivado: Rotulos, gravado: RotulosGravados | undefined): RotulosGravados {
	// Checagem explícita contra null/undefined, não truthy: `sobrescritoPor: ''`
	// não pode passar por "sem sobrescrita" só porque string vazia é falsy em JS.
	if (gravado?.sobrescritoPor != null) return gravado
	return {
		...derivado,
		prosa: gravado?.prosa ?? null,
		sobrescritoPor: null,
	}
}

export async function lerRotulos(vehicleIds: number[]): Promise<Map<number, RotulosGravados>> {
	const mapa = new Map<number, RotulosGravados>()
	if (vehicleIds.length === 0) return mapa

	const linhas = await db
		.selectFrom('vehicle_semantic_labels')
		.selectAll()
		.where('vehicle_id', 'in', vehicleIds)
		.execute()

	for (const l of linhas) {
		// Number(...) é defensivo, não decorativo: o driver `pg` faz parsing
		// de bigint (OID 20/int8) para STRING em JS, então se a coluna algum
		// dia voltar a ser bigint (ou outra tabela nova nascer bigint por
		// engano), `l.vehicle_id` chega como "123" apesar de o tipo do
		// Kysely dizer `number`. Sem essa coerção, `mapa.set("123", ...)`
		// nunca bate com `gravados.get(Number(v.id))` — a sobrescrita fica
		// no banco, protegida, e simplesmente nunca é enxergada. Falha
		// silenciosa. Não remover achando redundante.
		mapa.set(Number(l.vehicle_id), {
			uso: filtrarValidos<RotuloUso>(l.rotulos_uso, USO_VALIDOS),
			comprador: filtrarValidos<RotuloComprador>(l.rotulos_comprador, COMPRADOR_VALIDOS),
			forca: filtrarValidos<RotuloForca>(l.rotulos_forca, FORCA_VALIDOS),
			prosa: l.prosa,
			sobrescritoPor: l.sobrescrito_por,
		})
	}
	return mapa
}

/**
 * Grava o que a regra derivou — NUNCA pisando em linha sobrescrita à mão.
 * O `where` do upsert é a trava; sem ele, a primeira sincronização apagaria
 * toda correção da Attra.
 */
export async function gravarRotulosDerivados(
	linhas: { vehicle_id: number; rotulos: Rotulos; prosa: string | null }[],
): Promise<number> {
	if (linhas.length === 0) return 0

	// `atualizado_em`/`criado_em` ficam de fora do INSERT — são
	// `Generated<Timestamp>` (default no banco) e o tipo do Kysely para
	// insert em lote não aceita `sql\`now()\`` nem `Date` aqui (ColumnType
	// aninhado). No conflito, `atualizado_em` é setado explicitamente
	// abaixo via `sql\`now()\``, que nesse ponto (objeto único do
	// doUpdateSet, não array) tipa sem problema.
	const valores = linhas.map(l => ({
		vehicle_id: l.vehicle_id,
		rotulos_uso: l.rotulos.uso,
		rotulos_comprador: l.rotulos.comprador,
		rotulos_forca: l.rotulos.forca,
		prosa: l.prosa,
		sobrescrito_por: null,
	}))

	const r = await db
		.insertInto('vehicle_semantic_labels')
		.values(valores)
		.onConflict(oc => oc.column('vehicle_id').doUpdateSet({
			rotulos_uso: eb => eb.ref('excluded.rotulos_uso'),
			rotulos_comprador: eb => eb.ref('excluded.rotulos_comprador'),
			rotulos_forca: eb => eb.ref('excluded.rotulos_forca'),
			prosa: eb => eb.ref('excluded.prosa'),
			atualizado_em: sql`now()`,
		}).where('vehicle_semantic_labels.sobrescrito_por', 'is', null))
		.executeTakeFirst()

	return Number(r.numInsertedOrUpdatedRows ?? 0)
}

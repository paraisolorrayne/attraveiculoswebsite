import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { Rotulos, RotuloUso, RotuloComprador, RotuloForca } from '@/lib/mcp/rotulos'

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
	if (gravado?.sobrescritoPor) return gravado
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
		mapa.set(l.vehicle_id, {
			uso: l.rotulos_uso as RotuloUso[],
			comprador: l.rotulos_comprador as RotuloComprador[],
			forca: l.rotulos_forca as RotuloForca[],
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

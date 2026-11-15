/**
 * Registro de quais carros já tiveram criativo (ver a migration
 * 20261114_criativos_gerados para o porquê de não usar a fila do Marketing).
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'

export type OrigemDoRegistro = 'gerador' | 'manual'

/** Id da AutoConf vindo de formulário ou JSON: só inteiro positivo vale. */
export function idDoVeiculo(valor: unknown): number | null {
	const n = typeof valor === 'number' ? valor : typeof valor === 'string' && /^\d{1,12}$/.test(valor.trim()) ? Number(valor.trim()) : NaN
	return Number.isSafeInteger(n) && n > 0 ? n : null
}

/** Marca o carro como "já tem criativo". Chamar de novo só soma e atualiza a data. */
export async function registrarCriativo(reg: {
	autoconfId: number
	nome: string | null
	origem: OrigemDoRegistro
	por: { id: string; nome: string }
}): Promise<void> {
	await db
		.insertInto('criativos_gerados')
		.values({
			autoconf_id: reg.autoconfId,
			nome: reg.nome,
			origem: reg.origem,
			criado_por: reg.por.id,
			criado_por_nome: reg.por.nome,
		})
		.onConflict(oc =>
			oc.column('autoconf_id').doUpdateSet({
				pecas: sql`criativos_gerados.pecas + 1`,
				ultimo_em: sql`now()`,
			}),
		)
		.execute()
}

/** Ids (como texto) dos carros que já têm criativo. */
export async function idsComCriativo(): Promise<Set<string>> {
	const linhas = await db.selectFrom('criativos_gerados').select('autoconf_id').execute()
	return new Set(linhas.map(l => String(l.autoconf_id)))
}

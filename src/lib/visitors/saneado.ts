/**
 * Saneamento de colunas de atribuição no SQL.
 *
 * Saiu de sql-atribuicao.ts em 02/10/2026 só para quebrar um ciclo de import
 * (escopo.ts ↔ sql-atribuicao.ts); a regra é a mesma de sempre.
 */
import { sql, type RawBuilder } from 'kysely'
import { VALORES_NULOS_LISTA } from '@/lib/traffic-channel'

// Lista de "valores que significam vazio" vinda da lib de canal — ela é a fonte de verdade da
// classificação, então é ela quem define o que é vazio, aqui também.
const VAZIOS_SQL = sql.join(VALORES_NULOS_LISTA.map((v) => sql`${v}`))

/**
 * Aplica no SQL o MESMO saneamento que `limpar()` faz na lib: apara, e trata '(not set)',
 * '(none)', 'null', 'undefined', 'direct', '-' como ausência de valor.
 *
 * Sem isso a rota e a lib discordavam: para o SQL `utm_source = '(not set)'` era um valor
 * presente, para a lib era vazio. A mesma sessão saía como "direto" numa tabela e como
 * "assistente de IA" noutra. Saneando aqui existe UMA definição — e de quebra o GROUP BY
 * agrupa toda a sujeira numa linha só em vez de espalhá-la.
 */
export function saneado(coluna: RawBuilder<unknown>) {
	return sql<string | null>`nullif(
		case when lower(btrim(${coluna})) in (${VAZIOS_SQL}) then null else btrim(${coluna}) end,
		''
	)`
}

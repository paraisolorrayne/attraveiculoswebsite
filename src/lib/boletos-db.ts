/**
 * Boletos no banco (18/11/2026): listar com filtros, resumir, cadastrar um,
 * importar a planilha, atualizar e registrar o que foi feito em cada um.
 *
 * As regras (o que é telefone válido, em que situação o boleto está) moram em
 * src/lib/boletos.ts. Aqui só entra o que precisa do banco.
 */
import { sql, type ExpressionBuilder, type Transaction } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { chaveDeDuplicata, somarDias, type Boleto, type DadosDoBoleto, type EventoDoBoleto, type StatusBoleto } from '@/lib/boletos'
import { avisarOFykos, type EventoDeSaida } from '@/lib/boletos-fykos'

export interface Autor {
	id: string
	nome: string
}

type Linha = Record<string, unknown>
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null)

function paraBoleto(l: Linha): Boleto {
	return {
		id: String(l.id),
		nome: String(l.nome),
		telefone: String(l.telefone),
		email: (l.email as string | null) ?? null,
		vencimento: String(l.vencimento),
		valor: l.valor === null || l.valor === undefined ? null : Number(l.valor),
		descricao: (l.descricao as string | null) ?? null,
		carro: (l.carro as string | null) ?? null,
		placa: (l.placa as string | null) ?? null,
		parcela: l.parcela === null || l.parcela === undefined ? null : Number(l.parcela),
		parcelas: l.parcelas === null || l.parcelas === undefined ? null : Number(l.parcelas),
		status: l.status as StatusBoleto,
		pago_em: (l.pago_em as string | null) ?? null,
		origem: String(l.origem),
		lote_id: (l.lote_id as string | null) ?? null,
		lembretes: Number(l.lembretes ?? 0),
		ultimo_lembrete_em: iso(l.ultimo_lembrete_em),
		promessa_em: (l.promessa_em as string | null) ?? null,
		comprovante_em: iso(l.comprovante_em),
		comprovante_url: (l.comprovante_url as string | null) ?? null,
		falha_envio: (l.falha_envio as string | null) ?? null,
		criado_por_nome: (l.criado_por_nome as string | null) ?? null,
		criado_em: iso(l.criado_em) ?? '',
		atualizado_em: iso(l.atualizado_em) ?? '',
	}
}

/**
 * As colunas do boleto, com as datas já como texto AAAA-MM-DD. O driver
 * devolveria `date` como Date à meia-noite do fuso do servidor, e a conversão
 * de volta para dia pode cair no dia anterior.
 */
const COLUNAS = [
	'id', 'nome', 'telefone', 'email', 'valor', 'descricao', 'carro', 'placa', 'parcela', 'parcelas', 'status', 'origem', 'lote_id', 'lembretes',
	'ultimo_lembrete_em', 'comprovante_em', 'comprovante_url', 'falha_envio', 'criado_por_nome', 'criado_em', 'atualizado_em',
	sql<string>`to_char(vencimento, 'YYYY-MM-DD')`.as('vencimento'),
	sql<string | null>`to_char(promessa_em, 'YYYY-MM-DD')`.as('promessa_em'),
	sql<string | null>`to_char(pago_em, 'YYYY-MM-DD')`.as('pago_em'),
] as const

/* ----------------------------------------------------------------- listar */

export interface FiltrosDeBoletos {
	q?: string
	/** '' = em aberto; comprovante | promessa | falha | atraso | hoje | semana | a-vencer | em_negociacao | pago | cancelado | todos */
	sit?: string
	lote?: string
	ordem?: string
	pagina?: number
}

export const POR_PAGINA = 100

/** Sem acento e em minúsculas, para "joao" achar "João" sem depender de extensão do banco. */
const semAcentoSql = (coluna: string) =>
	sql`translate(lower(${sql.ref(coluna)}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`

function filtrar(f: FiltrosDeBoletos, hoje: string) {
	return (eb: ExpressionBuilder<Database, 'boletos'>) => {
		const partes = []
		const dia = (d: string) => sql<Date>`${d}::date`
		// Aberto "livre": sem comprovante para conferir e sem promessa ainda valendo.
		// É a mesma ordem de `situacaoDoBoleto` (boletos.ts): a tela e o filtro
		// precisam concordar sobre onde cada boleto está.
		const livre = sql<boolean>`status = 'aberto' and comprovante_em is null and (promessa_em is null or promessa_em < ${hoje}::date)`
		switch (f.sit ?? '') {
			case 'comprovante':
				partes.push(eb('status', 'in', ['aberto', 'em_negociacao']), eb('comprovante_em', 'is not', null))
				break
			case 'promessa':
				partes.push(sql<boolean>`status = 'aberto' and comprovante_em is null and promessa_em >= ${hoje}::date`)
				break
			case 'falha':
				partes.push(eb('status', 'in', ['aberto', 'em_negociacao']), eb('falha_envio', 'is not', null))
				break
			case 'atraso':
				partes.push(livre, eb('vencimento', '<', dia(hoje)))
				break
			case 'hoje':
				partes.push(livre, eb('vencimento', '=', dia(hoje)))
				break
			case 'semana':
				partes.push(livre, eb('vencimento', '>', dia(hoje)), eb('vencimento', '<=', dia(somarDias(hoje, 7))))
				break
			case 'a-vencer':
				partes.push(livre, eb('vencimento', '>', dia(hoje)))
				break
			case 'em_negociacao':
				partes.push(eb('status', '=', 'em_negociacao'), eb('comprovante_em', 'is', null))
				break
			case 'pago':
			case 'cancelado':
				partes.push(eb('status', '=', f.sit as string))
				break
			case 'todos':
				break
			default:
				partes.push(eb('status', 'in', ['aberto', 'em_negociacao']))
		}
		if (f.lote && /^[0-9a-f-]{36}$/i.test(f.lote)) partes.push(eb('lote_id', '=', f.lote))
		const termo = (f.q ?? '').trim().slice(0, 80)
		if (termo) {
			const limpo = termo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
			const digitos = termo.replace(/\D/g, '')
			partes.push(
				eb.or([
					sql<boolean>`${semAcentoSql('nome')} like ${`%${limpo}%`}`,
					sql<boolean>`${semAcentoSql('descricao')} like ${`%${limpo}%`}`,
					sql<boolean>`${semAcentoSql('carro')} like ${`%${limpo}%`}`,
					sql<boolean>`lower(placa) like ${`%${limpo}%`}`,
					...(digitos.length >= 3 ? [eb('telefone', 'like', `%${digitos}%`)] : []),
				]),
			)
		}
		return eb.and(partes)
	}
}

export async function listarBoletos(f: FiltrosDeBoletos, hoje: string): Promise<{ boletos: Boleto[]; total: number; pagina: number; paginas: number }> {
	const onde = filtrar(f, hoje)
	const contagem = await db.selectFrom('boletos').select(sql<string>`count(*)`.as('n')).where(onde).executeTakeFirst()
	const total = Number(contagem?.n ?? 0)
	const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
	const pagina = Math.min(Math.max(1, f.pagina ?? 1), paginas)

	let consulta = db.selectFrom('boletos').select(COLUNAS).where(onde)
	if (f.ordem === 'nome') consulta = consulta.orderBy(semAcentoSql('nome'), 'asc')
	else if (f.ordem === 'recentes') consulta = consulta.orderBy('criado_em', 'desc')
	else if (f.ordem === 'valor') consulta = consulta.orderBy(sql`valor desc nulls last`)
	else if (f.ordem === 'venc-desc') consulta = consulta.orderBy('vencimento', 'desc')
	else consulta = consulta.orderBy('vencimento', 'asc')
	const linhas = await consulta.orderBy('criado_em', 'desc').limit(POR_PAGINA).offset((pagina - 1) * POR_PAGINA).execute()
	return { boletos: linhas.map(l => paraBoleto(l as Linha)), total, pagina, paginas }
}

export interface ResumoDosBoletos {
	/** Todos os boletos, de qualquer status: 0 = a tela ainda está vazia. */
	cadastrados: number
	atraso: { quantos: number; valor: number }
	hoje: { quantos: number; valor: number }
	semana: { quantos: number; valor: number }
	/** Comprovantes que o cliente mandou e ninguém conferiu ainda. */
	comprovantes: { quantos: number; valor: number }
	abertos: { quantos: number; valor: number }
}

export async function resumoDosBoletos(hoje: string): Promise<ResumoDosBoletos> {
	const d = sql`${hoje}::date`
	const livre = sql`status = 'aberto' and comprovante_em is null and (promessa_em is null or promessa_em < ${d})`
	const abertos = sql`status in ('aberto', 'em_negociacao')`
	const par = (nome: string, onde: ReturnType<typeof sql>) => [
		sql<string>`count(*) filter (where ${onde})`.as(nome),
		sql<string>`coalesce(sum(valor) filter (where ${onde}), 0)`.as(`${nome}_valor`),
	]
	const l = (await db
		.selectFrom('boletos')
		.select([
			sql<string>`count(*)`.as('cadastrados'),
			...par('atraso', sql`${livre} and vencimento < ${d}`),
			...par('hoje', sql`${livre} and vencimento = ${d}`),
			...par('semana', sql`${livre} and vencimento > ${d} and vencimento <= ${d} + 7`),
			...par('comprovantes', sql`${abertos} and comprovante_em is not null`),
			...par('abertos', abertos),
		])
		.executeTakeFirst()) as Record<string, unknown> | undefined
	const grupo = (nome: string) => ({ quantos: Number(l?.[nome] ?? 0), valor: Number(l?.[`${nome}_valor`] ?? 0) })
	return {
		cadastrados: Number(l?.cadastrados ?? 0),
		atraso: grupo('atraso'),
		hoje: grupo('hoje'),
		semana: grupo('semana'),
		comprovantes: grupo('comprovantes'),
		abertos: grupo('abertos'),
	}
}

export async function buscarBoleto(id: string): Promise<{ boleto: Boleto; eventos: EventoDoBoleto[] } | null> {
	const linha = await db.selectFrom('boletos').select(COLUNAS).where('id', '=', id).executeTakeFirst()
	if (!linha) return null
	const eventos = await db
		.selectFrom('boleto_eventos')
		.select(['id', 'tipo', 'descricao', 'por_nome', 'criado_em'])
		.where('boleto_id', '=', id)
		.orderBy('criado_em', 'desc')
		.limit(200)
		.execute()
	return {
		boleto: paraBoleto(linha as Linha),
		eventos: eventos.map(e => ({ id: e.id, tipo: e.tipo, descricao: e.descricao, por_nome: e.por_nome, criado_em: iso(e.criado_em) ?? '' })),
	}
}

/* ------------------------------------------------------------- cadastrar */

/**
 * Das linhas dadas, as chaves (telefone + vencimento + valor) que já existem
 * no banco em boleto não cancelado. Serve para não cadastrar o mesmo boleto
 * duas vezes quando a planilha é enviada de novo.
 */
export async function duplicatasNoBanco(
	linhas: { telefone: string; vencimento: string; valor: number | null; carro?: string | null; placa?: string | null }[],
	conexao: Transaction<Database> | typeof db = db,
): Promise<Set<string>> {
	const telefones = [...new Set(linhas.map(l => l.telefone))]
	if (telefones.length === 0) return new Set()
	const existentes = await conexao
		.selectFrom('boletos')
		.select(['telefone', 'valor', 'carro', 'placa', sql<string>`to_char(vencimento, 'YYYY-MM-DD')`.as('vencimento')])
		.where('telefone', 'in', telefones)
		.where('status', '!=', 'cancelado')
		.execute()
	return new Set(existentes.map(e => chaveDeDuplicata({ telefone: e.telefone, vencimento: e.vencimento, valor: e.valor === null ? null : Number(e.valor), carro: e.carro, placa: e.placa })))
}

/**
 * Um cadastro de cada vez (avulso ou planilha). A checagem de duplicado e a
 * gravação precisam enxergar o mesmo estado: sem esta trava, duas planilhas
 * enviadas juntas passariam as duas pela checagem e gravariam o mesmo boleto
 * duas vezes, e o cliente seria cobrado em dobro.
 */
const travarCadastro = (trx: Transaction<Database>) => sql`select pg_advisory_xact_lock(hashtext('boletos-cadastro'))`.execute(trx)

/** Cadastra um boleto. Devolve `null` se já existe um igual e `forcar` não foi pedido. */
export async function criarBoleto(dados: DadosDoBoleto, por: Autor, forcar = false): Promise<Boleto | null> {
	return db.transaction().execute(async trx => {
		await travarCadastro(trx)
		if (!forcar && (await duplicatasNoBanco([dados], trx)).has(chaveDeDuplicata(dados))) return null
		const linha = await trx
			.insertInto('boletos')
			.values({ ...dados, origem: 'manual', criado_por: por.id, criado_por_nome: por.nome })
			.returning(COLUNAS)
			.executeTakeFirstOrThrow()
		await trx.insertInto('boleto_eventos').values({ boleto_id: linha.id, tipo: 'criado', descricao: 'Cadastrado no painel', por: por.id, por_nome: por.nome }).execute()
		const boleto = paraBoleto(linha as Linha)
		await avisarOFykos(trx, 'boleto.cadastrado', [boleto])
		return boleto
	})
}

/**
 * Soma a planilha ao que já existe: pula o que já está cadastrado e grava o
 * resto, tudo ou nada. A checagem de duplicado é refeita aqui dentro, com a
 * trava de cadastro, e é ela que vale; `puladas` diz o que ficou de fora por
 * já existir.
 */
export async function importarBoletos(candidatas: DadosDoBoleto[], por: Autor): Promise<{ lote_id: string | null; criados: number; puladas: Set<string> }> {
	return db.transaction().execute(async trx => {
		await travarCadastro(trx)
		const puladas = await duplicatasNoBanco(candidatas, trx)
		const linhas = candidatas.filter(l => !puladas.has(chaveDeDuplicata(l)))
		if (linhas.length === 0) return { lote_id: null, criados: 0, puladas }
		const lote = await sql<{ id: string }>`select gen_random_uuid() as id`.execute(trx)
		const lote_id = lote.rows[0].id
		let criados = 0
		for (let i = 0; i < linhas.length; i += 500) {
			const parte = linhas.slice(i, i + 500)
			const inseridos = await trx
				.insertInto('boletos')
				.values(parte.map(l => ({ ...l, origem: 'planilha', lote_id, criado_por: por.id, criado_por_nome: por.nome })))
				.returning(COLUNAS)
				.execute()
			await trx
				.insertInto('boleto_eventos')
				.values(inseridos.map(b => ({ boleto_id: b.id, tipo: 'criado', descricao: 'Importado da planilha', por: por.id, por_nome: por.nome })))
				.execute()
			await avisarOFykos(trx, 'boleto.cadastrado', inseridos.map(b => paraBoleto(b as Linha)))
			criados += inseridos.length
		}
		return { lote_id, criados, puladas }
	})
}

/* -------------------------------------------------------------- atualizar */

const ROTULO_DO_STATUS: Record<StatusBoleto, string> = {
	aberto: 'Reaberto',
	em_negociacao: 'Em negociação',
	pago: 'Marcado como pago',
	cancelado: 'Cancelado',
}

export interface MudancasDoBoleto extends Partial<DadosDoBoleto> {
	status?: StatusBoleto
	/** Só com status 'pago'. Sem ela, vale hoje. */
	pago_em?: string
	/** O comprovante não servia (imagem errada, valor errado): o boleto volta para a fila normal. */
	descartarComprovante?: boolean
}

export async function atualizarBoleto(id: string, m: MudancasDoBoleto, por: Autor, hoje: string): Promise<Boleto | null> {
	return db.transaction().execute(async trx => {
		const antes = await trx.selectFrom('boletos').select(COLUNAS).where('id', '=', id).forUpdate().executeTakeFirst()
		if (!antes) return null
		const atual = paraBoleto(antes as Linha)

		const campos: Record<string, unknown> = {}
		const mudou: string[] = []
		const comparar = <C extends keyof DadosDoBoleto>(campo: C, rotulo: string) => {
			if (m[campo] !== undefined && m[campo] !== atual[campo]) {
				campos[campo] = m[campo]
				mudou.push(rotulo)
			}
		}
		comparar('nome', 'nome')
		comparar('telefone', 'telefone')
		comparar('email', 'e-mail')
		comparar('vencimento', 'vencimento')
		comparar('valor', 'valor')
		comparar('descricao', 'descrição')
		comparar('carro', 'carro')
		comparar('placa', 'placa')

		const eventos: { tipo: string; descricao: string }[] = []
		if (mudou.length > 0) {
			const detalhe = mudou.includes('vencimento') ? ` (vencimento de ${atual.vencimento.split('-').reverse().join('/')} para ${String(m.vencimento).split('-').reverse().join('/')})` : ''
			eventos.push({ tipo: 'editado', descricao: `Alterou ${mudou.join(', ')}${detalhe}` })
		}
		let aviso: EventoDeSaida | null = mudou.length > 0 ? 'boleto.atualizado' : null
		if (m.status && m.status !== atual.status) {
			campos.status = m.status
			campos.pago_em = m.status === 'pago' ? (m.pago_em ?? hoje) : null
			// Reabrir NÃO apaga a promessa nem o comprovante: "Desfazer" logo depois
			// de marcar como pago precisa devolver o boleto como ele estava.
			const reabriu = (m.status === 'aberto' || m.status === 'em_negociacao') && (atual.status === 'pago' || atual.status === 'cancelado')
			eventos.push({ tipo: m.status === 'aberto' ? 'reaberto' : m.status, descricao: ROTULO_DO_STATUS[m.status] })
			aviso = m.status === 'pago' ? 'boleto.pago' : m.status === 'cancelado' ? 'boleto.cancelado' : reabriu ? 'boleto.reaberto' : 'boleto.atualizado'
		}
		if (m.descartarComprovante && atual.comprovante_em) {
			Object.assign(campos, { comprovante_em: null, comprovante_url: null })
			eventos.push({ tipo: 'comprovante', descricao: 'Comprovante descartado: o pagamento não foi confirmado' })
			// O Fykos precisa saber para a Ângela voltar a lembrar.
			aviso ??= 'boleto.atualizado'
		}
		if (Object.keys(campos).length === 0) return atual

		const depois = await trx
			.updateTable('boletos')
			.set({ ...campos, atualizado_em: new Date() })
			.where('id', '=', id)
			.returning(COLUNAS)
			.executeTakeFirstOrThrow()
		await trx.insertInto('boleto_eventos').values(eventos.map(e => ({ boleto_id: id, ...e, por: por.id, por_nome: por.nome }))).execute()
		const boleto = paraBoleto(depois as Linha)
		if (aviso) await avisarOFykos(trx, aviso, [boleto])
		return boleto
	})
}

/** Lembrete aberto no WhatsApp (conta no boleto) ou um contato anotado à mão. */
export async function registrarEvento(id: string, tipo: 'lembrete' | 'contato', descricao: string | null, por: Autor): Promise<Boleto | null> {
	return db.transaction().execute(async trx => {
		const existe = await trx.selectFrom('boletos').select('id').where('id', '=', id).executeTakeFirst()
		if (!existe) return null
		await trx.insertInto('boleto_eventos').values({ boleto_id: id, tipo, descricao, por: por.id, por_nome: por.nome }).execute()
		const depois = await trx
			.updateTable('boletos')
			.set({
				atualizado_em: new Date(),
				...(tipo === 'lembrete' ? { lembretes: sql<number>`lembretes + 1`, ultimo_lembrete_em: new Date() } : {}),
			})
			.where('id', '=', id)
			.returning(COLUNAS)
			.executeTakeFirstOrThrow()
		return paraBoleto(depois as Linha)
	})
}

export async function excluirBoleto(id: string): Promise<boolean> {
	return db.transaction().execute(async trx => {
		const apagados = await trx.deleteFrom('boletos').where('id', '=', id).returning(COLUNAS).execute()
		await avisarOFykos(trx, 'boleto.excluido', apagados.map(b => paraBoleto(b as Linha)))
		return apagados.length > 0
	})
}

/**
 * Desfaz uma planilha recém-enviada: apaga os boletos que ela criou. Serve
 * para a planilha errada (a do mês passado, por exemplo). Os boletos que já
 * existiam antes dela não são tocados, porque não foram ela que criou.
 */
export async function excluirLote(loteId: string): Promise<number> {
	return db.transaction().execute(async trx => {
		const apagados = await trx.deleteFrom('boletos').where('lote_id', '=', loteId).returning(COLUNAS).execute()
		await avisarOFykos(trx, 'boleto.excluido', apagados.map(b => paraBoleto(b as Linha)))
		return apagados.length
	})
}

/**
 * Manda ao Fykos todos os boletos em aberto de uma vez. Para o dia em que a
 * integração é ligada com boletos já cadastrados, ou para ressincronizar. O
 * Fykos trata pelo id, então reenviar não duplica nada lá.
 */
export async function reenviarAbertosAoFykos(): Promise<number> {
	return db.transaction().execute(async trx => {
		// Trava as linhas lidas até o aviso entrar na fila: um pagamento ou uma
		// exclusão ao mesmo tempo espera, e o aviso dele entra DEPOIS deste. Sem
		// isso, o retrato "aberto" podia entrar na fila depois do "pago" e
		// reabrir o boleto no Fykos.
		const abertos = await trx.selectFrom('boletos').select(COLUNAS).where('status', 'in', ['aberto', 'em_negociacao']).orderBy('vencimento').forUpdate().execute()
		await avisarOFykos(trx, 'boleto.cadastrado', abertos.map(b => paraBoleto(b as Linha)))
		return abertos.length
	})
}

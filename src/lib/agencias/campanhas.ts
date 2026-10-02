/**
 * Regras do cadastro de campanhas da agência (spec 2026-10-02-area-agencia).
 * Puras: o que fala com o banco está em campanhas-db.ts.
 */
import type { PlataformaCampanha } from '@/lib/db/types'

export interface CampanhaEntrada {
	plataforma: PlataformaCampanha
	nome: string
	id_externo: string | null
	destino: 'site' | 'whatsapp'
	mensagem_prefixo: string | null
	inicio: string
	fim: string | null
}

const PLATAFORMAS: readonly PlataformaCampanha[] = ['google', 'meta', 'webmotors']
const DATA = /^\d{4}-\d{2}-\d{2}$/

function texto(v: unknown): string {
	return typeof v === 'string' ? v.trim() : ''
}

/**
 * Valida e normaliza o que veio do formulário. Apara espaços (o ID colado do
 * gerenciador costuma vir com espaço), e no Google e na Meta o ID é só número
 * — é o mesmo que chega no `utm_id` das visitas, e é por ele que elas casam.
 */
export function validarCampanha(entrada: unknown): { ok: true; valor: CampanhaEntrada } | { ok: false; erro: string } {
	const e = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>

	const plataforma = texto(e.plataforma) as PlataformaCampanha
	if (!PLATAFORMAS.includes(plataforma)) return { ok: false, erro: 'Escolha a plataforma: Google, Meta ou WebMotors' }

	const nome = texto(e.nome)
	if (!nome) return { ok: false, erro: 'Informe o nome da campanha' }
	if (nome.length > 200) return { ok: false, erro: 'Nome longo demais (máx. 200 caracteres)' }

	const id = texto(e.id_externo)
	const id_externo = id || null
	if (id_externo && plataforma !== 'webmotors' && !/^\d{5,25}$/.test(id_externo)) {
		return { ok: false, erro: 'O ID da campanha no Google e na Meta tem só números' }
	}
	if (id_externo && id_externo.length > 100) return { ok: false, erro: 'ID longo demais' }

	const destino = texto(e.destino) === 'whatsapp' ? 'whatsapp' : 'site'
	const mensagem = texto(e.mensagem_prefixo)
	if (mensagem && destino !== 'whatsapp') {
		return { ok: false, erro: 'A mensagem do anúncio só vale para campanha que manda direto para o WhatsApp' }
	}
	if (mensagem.length > 200) return { ok: false, erro: 'Mensagem do anúncio longa demais (máx. 200 caracteres)' }

	const inicio = texto(e.inicio)
	if (!DATA.test(inicio)) return { ok: false, erro: 'Informe a data de início' }
	const fim = texto(e.fim) || null
	if (fim && !DATA.test(fim)) return { ok: false, erro: 'Data de fim inválida' }
	if (fim && fim < inicio) return { ok: false, erro: 'O fim não pode ser antes do início' }

	return { ok: true, valor: { plataforma, nome, id_externo, destino, mensagem_prefixo: mensagem || null, inicio, fim } }
}

export type SituacaoCampanha = 'ativa' | 'agendada' | 'encerrada'

/** Datas como `YYYY-MM-DD` (fuso da loja). O dia do fim ainda conta como ativo. */
export function situacaoDaCampanha(c: { inicio: string; fim: string | null }, hoje: string): SituacaoCampanha {
	if (c.inicio > hoje) return 'agendada'
	if (c.fim && c.fim < hoje) return 'encerrada'
	return 'ativa'
}

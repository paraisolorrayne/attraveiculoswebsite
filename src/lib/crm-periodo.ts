// Período e SLA do CRM no fuso de São Paulo.
//
// Por que não dá para usar o relógio local: o filtro roda no navegador do
// gestor, e "hoje" precisa ser o dia comercial da Attra — não o dia do
// aparelho. O servidor tampouco serve de referência: a VPS roda em +02
// (Europa), então às 20:00 BRT o `now()` de lá já está no dia seguinte.
//
// O filtro antigo era janela MÓVEL de 24h ("Hoje" às 8h da manhã pegava as
// 23:00 de ontem e ainda assim perdia um alerta das 09:27 no dia seguinte).
// Aqui "Hoje" é 00:00 BRT → agora, e os demais períodos são N dias-calendário
// contando hoje como o primeiro.

const TZ = 'America/Sao_Paulo'
const DIA_MS = 86_400_000
const HORA_MS = 3_600_000

const FMT = new Intl.DateTimeFormat('en-CA', {
	timeZone: TZ,
	hour12: false,
	year: 'numeric', month: '2-digit', day: '2-digit',
	hour: '2-digit', minute: '2-digit', second: '2-digit',
})

/**
 * Epoch que, LIDO COMO UTC, carrega o relógio de parede de São Paulo.
 * Truque para fazer aritmética de calendário local sem depender do fuso do
 * ambiente: `new Date(parede(t)).getUTCHours()` devolve a hora em Brasília.
 */
function parede(ms: number): number {
	const p: Record<string, string> = {}
	for (const parte of FMT.formatToParts(new Date(ms))) {
		if (parte.type !== 'literal') p[parte.type] = parte.value
	}
	// hour12:false ainda devolve "24" para a meia-noite em alguns runtimes
	const hora = Number(p.hour) % 24
	return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hora, Number(p.minute), Number(p.second))
}

/** Quanto somar a um instante para chegar no relógio de parede daqui. */
function deslocamento(ms: number): number {
	return parede(ms) - ms
}

/** Instante da meia-noite (BRT) do dia em que `ms` cai. */
export function inicioDoDiaBRT(ms: number): number {
	const p = new Date(parede(ms))
	const meiaNoiteParede = Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate())
	return meiaNoiteParede - deslocamento(ms)
}

/**
 * Início do período em dias-calendário, com HOJE contando como o 1º dia:
 * 1 → hoje 00:00; 7 → 00:00 de seis dias atrás. `0` = "Tudo".
 */
export function inicioDoPeriodoBRT(dias: number, agora: number): number {
	if (dias <= 0) return Number.NEGATIVE_INFINITY
	const hoje = inicioDoDiaBRT(agora)
	if (dias === 1) return hoje
	// Recalcula a meia-noite do dia alvo em vez de subtrair N×24h do resultado:
	// se o Brasil voltar a ter horário de verão, a subtração crua erraria em 1h.
	return inicioDoDiaBRT(hoje - (dias - 1) * DIA_MS + 12 * HORA_MS)
}

/* ---------- janela comercial (SLA de aceite) ---------- */

// Mesma régua da janela de distribuição do emissor
// (attra-py/agents/otto/janela_distribuicao.py): abre 09:00, fecha 21:00 em
// dia útil e 13:00 no sábado; domingo não conta. Feriado NÃO é tratado aqui —
// exigiria um calendário nacional+municipal, e errar para mais (mostrar
// atraso num feriado) é menos grave do que esconder um lead abandonado.
const ABERTURA = 9
const FECHAMENTO_DIA_UTIL = 21
const FECHAMENTO_SABADO = 13

function janelaDoDia(diaSemana: number): [number, number] | null {
	if (diaSemana === 0) return null
	if (diaSemana === 6) return [ABERTURA, FECHAMENTO_SABADO]
	return [ABERTURA, FECHAMENTO_DIA_UTIL]
}

/** Milissegundos de horário comercial decorridos entre dois instantes. */
export function msComerciaisEntre(inicio: number, fim: number): number {
	if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) return 0

	const de = parede(inicio)
	const ate = parede(fim)
	const primeiro = new Date(de)
	let dia = Date.UTC(primeiro.getUTCFullYear(), primeiro.getUTCMonth(), primeiro.getUTCDate())

	let total = 0
	// Trava de segurança: card de anos atrás não pode virar laço longo na
	// renderização de cada cartão do quadro.
	for (let guarda = 0; dia <= ate && guarda < 400; guarda++, dia += DIA_MS) {
		const janela = janelaDoDia(new Date(dia).getUTCDay())
		if (!janela) continue
		const abre = Math.max(dia + janela[0] * HORA_MS, de)
		const fecha = Math.min(dia + janela[1] * HORA_MS, ate)
		if (fecha > abre) total += fecha - abre
	}
	return total
}

/* ---------- atraso no aceite ---------- */

export type NivelAtraso = 'ok' | 'atencao' | 'critico'

export const ATRASO_ATENCAO_MS = 2 * HORA_MS
export const ATRASO_CRITICO_MS = 4 * HORA_MS

/**
 * Há quanto tempo (em horário comercial) o lead espera aceite.
 * Devolve null quando não há data confiável — sem data não se afirma atraso.
 */
export function atrasoAceite(
	alertadoEm: string | null | undefined,
	agora: number,
): { ms: number; nivel: NivelAtraso } | null {
	if (typeof alertadoEm !== 'string' || alertadoEm.trim() === '') return null
	const t = Date.parse(alertadoEm)
	if (Number.isNaN(t)) return null

	const ms = msComerciaisEntre(t, agora)
	const nivel: NivelAtraso =
		ms >= ATRASO_CRITICO_MS ? 'critico' : ms >= ATRASO_ATENCAO_MS ? 'atencao' : 'ok'
	return { ms, nivel }
}

/** "3h" / "45min" — o tempo comercial, para o rótulo do card. */
export function fmtHorasComerciais(ms: number): string {
	const min = Math.floor(ms / 60_000)
	if (min < 60) return `${min}min`
	const h = ms / HORA_MS
	// 1,5h lido como "1h" faria o gestor achar que sobra tempo; arredonda pra baixo
	// só no inteiro e mostra a fração quando ela existe.
	return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1).replace('.', ',')}h`
}

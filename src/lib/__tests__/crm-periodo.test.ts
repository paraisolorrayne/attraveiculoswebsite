import { describe, it, expect } from 'vitest'
import { inicioDoDiaBRT, inicioDoPeriodoBRT, msComerciaisEntre, atrasoAceite } from '@/lib/crm-periodo'

// BRT = UTC-3 o ano inteiro (o horário de verão acabou em 2019).
const brt = (iso: string) => new Date(`${iso}-03:00`).getTime()

describe('inicioDoDiaBRT', () => {
	it('devolve a meia-noite de São Paulo, não a do fuso da máquina', () => {
		expect(inicioDoDiaBRT(brt('2026-08-10T13:31:18'))).toBe(brt('2026-08-10T00:00:00'))
	})

	it('01:00 BRT ainda é o mesmo dia (o UTC já virou, o daqui não)', () => {
		// 01:00 BRT = 04:00 UTC do dia 10; um filtro em UTC diria "dia 10" também,
		// mas às 22:00 BRT o UTC já é dia 11 — é esse o caso que quebra.
		expect(inicioDoDiaBRT(brt('2026-08-10T01:00:00'))).toBe(brt('2026-08-10T00:00:00'))
	})

	it('22:00 BRT continua no dia 10, mesmo com o UTC já no dia 11', () => {
		const t = brt('2026-08-10T22:00:00')
		expect(new Date(t).getUTCDate()).toBe(11) // confirma que o UTC virou
		expect(inicioDoDiaBRT(t)).toBe(brt('2026-08-10T00:00:00'))
	})

	it('00:00 BRT em ponto é o início dele mesmo', () => {
		expect(inicioDoDiaBRT(brt('2026-08-10T00:00:00'))).toBe(brt('2026-08-10T00:00:00'))
	})
})

describe('inicioDoPeriodoBRT', () => {
	const agora = brt('2026-08-10T22:30:00')

	it('"Hoje" (1 dia) começa hoje 00:00 BRT', () => {
		expect(inicioDoPeriodoBRT(1, agora)).toBe(brt('2026-08-10T00:00:00'))
	})

	it('hoje conta como um dia: 7d começa em 04/08, não em 03/08', () => {
		expect(inicioDoPeriodoBRT(7, agora)).toBe(brt('2026-08-04T00:00:00'))
	})

	it('15d começa em 27/07 e 30d em 12/07', () => {
		expect(inicioDoPeriodoBRT(15, agora)).toBe(brt('2026-07-27T00:00:00'))
		expect(inicioDoPeriodoBRT(30, agora)).toBe(brt('2026-07-12T00:00:00'))
	})

	it('0 = "Tudo" não corta nada', () => {
		expect(inicioDoPeriodoBRT(0, agora)).toBe(Number.NEGATIVE_INFINITY)
	})

	it('um alerta das 09:27 continua em "Hoje" às 23:59 — a janela móvel o perderia', () => {
		const alerta = brt('2026-08-10T09:27:10')
		const fimDoDia = brt('2026-08-10T23:59:00')
		expect(alerta).toBeGreaterThanOrEqual(inicioDoPeriodoBRT(1, fimDoDia))
		// prova do contraste: a janela de 24h móvel também pegaria aqui,
		// mas às 10:00 do dia seguinte ela solta e o dia-calendário já virou
		const amanha = brt('2026-08-11T10:00:00')
		expect(alerta).toBeLessThan(inicioDoPeriodoBRT(1, amanha))
	})

	it('o que aconteceu ontem 23:00 NÃO entra em "Hoje" (a janela móvel deixaria)', () => {
		const ontemTarde = brt('2026-08-09T23:00:00')
		const agoraCedo = brt('2026-08-10T08:00:00')
		expect(ontemTarde).toBeLessThan(inicioDoPeriodoBRT(1, agoraCedo))
		expect(agoraCedo - ontemTarde).toBeLessThan(86_400_000) // dentro das 24h móveis
	})
})

describe('msComerciaisEntre', () => {
	const h = (n: number) => n * 3_600_000

	it('conta só o que passou dentro da janela 09:00–21:00', () => {
		expect(msComerciaisEntre(brt('2026-08-10T09:27:00'), brt('2026-08-10T13:27:00'))).toBe(h(4))
	})

	it('não conta a madrugada: alerta 20:00 visto às 10:00 do dia seguinte = 2h', () => {
		// 20:00→21:00 (1h) + 09:00→10:00 (1h)
		expect(msComerciaisEntre(brt('2026-08-10T20:00:00'), brt('2026-08-11T10:00:00'))).toBe(h(2))
	})

	it('antes da abertura não acumula', () => {
		expect(msComerciaisEntre(brt('2026-08-10T06:00:00'), brt('2026-08-10T09:00:00'))).toBe(0)
	})

	it('sábado fecha às 13:00 e domingo não conta', () => {
		// 2026-08-15 é sábado, 16 é domingo, 17 é segunda
		expect(msComerciaisEntre(brt('2026-08-15T12:00:00'), brt('2026-08-15T18:00:00'))).toBe(h(1))
		expect(msComerciaisEntre(brt('2026-08-16T09:00:00'), brt('2026-08-16T21:00:00'))).toBe(0)
		// sexta 20:00 → segunda 10:00: 1h (sex) + 4h (sáb 9–13) + 0 (dom) + 1h (seg)
		expect(msComerciaisEntre(brt('2026-08-14T20:00:00'), brt('2026-08-17T10:00:00'))).toBe(h(6))
	})

	it('intervalo invertido ou vazio é zero, não negativo', () => {
		expect(msComerciaisEntre(brt('2026-08-10T15:00:00'), brt('2026-08-10T09:00:00'))).toBe(0)
		expect(msComerciaisEntre(brt('2026-08-10T15:00:00'), brt('2026-08-10T15:00:00'))).toBe(0)
	})
})

describe('atrasoAceite', () => {
	// Os 7 leads que ficaram invisíveis em 10/08 — o mais antigo saiu 09:27.
	const agora = brt('2026-08-10T13:31:00')

	it('sem data de alerta não afirma atraso nenhum', () => {
		expect(atrasoAceite(null, agora)).toBeNull()
	})

	it('data imprestável não vira "agora" nem 1970', () => {
		expect(atrasoAceite('nao-e-data', agora)).toBeNull()
	})

	it('menos de 2h comerciais = ok', () => {
		expect(atrasoAceite('2026-08-10T15:31:00Z', agora)?.nivel).toBe('ok') // 12:31 BRT, 1h
	})

	it('2h a 4h = atenção', () => {
		expect(atrasoAceite('2026-08-10T13:20:00Z', agora)?.nivel).toBe('atencao') // 10:20 BRT, ~3h
	})

	it('4h ou mais = crítico', () => {
		expect(atrasoAceite('2026-08-10T12:27:00Z', agora)?.nivel).toBe('critico') // 09:27 BRT, ~4h
	})

	it('alerta da noite anterior não amanhece crítico pela madrugada', () => {
		// segunda 19:30 → terça 09:30: 1,5h (seg 19:30–21:00) + 0,5h (ter 09:00–09:30)
		const olhadoCedo = brt('2026-08-11T09:30:00')
		const r = atrasoAceite('2026-08-10T22:30:00Z', olhadoCedo) // 19:30 BRT de segunda
		expect(r?.nivel).toBe('atencao')
		expect(r?.ms).toBe(2 * 3_600_000)
	})

	it('alerta de sexta à noite não vira 60h de atraso na segunda', () => {
		// sexta 20:00 → segunda 10:00 = 6h comerciais (não 62h corridas)
		const r = atrasoAceite('2026-08-14T23:00:00Z', brt('2026-08-17T10:00:00'))
		expect(r?.ms).toBe(6 * 3_600_000)
	})
})

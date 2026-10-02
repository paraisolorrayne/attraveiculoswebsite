import { describe, it, expect } from 'vitest'
import { situacaoDaCampanha, validarCampanha } from '@/lib/agencias/campanhas'

const base = { plataforma: 'google', nome: ' va-pmax-nucleo ', id_externo: ' 24295047322 ', inicio: '2026-09-01' }

describe('validarCampanha', () => {
	it('apara os campos e completa os padrões', () => {
		expect(validarCampanha(base)).toEqual({
			ok: true,
			valor: {
				plataforma: 'google', nome: 'va-pmax-nucleo', id_externo: '24295047322', destino: 'site',
				mensagem_prefixo: null, inicio: '2026-09-01', fim: null,
			},
		})
	})

	it('ID vazio vira null (campanha cadastrada só pelo nome)', () => {
		const r = validarCampanha({ ...base, id_externo: '  ' })
		expect(r.ok && r.valor.id_externo).toBe(null)
	})

	it('recusa o que não serve', () => {
		expect(validarCampanha({ ...base, plataforma: 'tiktok' })).toMatchObject({ ok: false })
		expect(validarCampanha({ ...base, nome: '   ' })).toMatchObject({ ok: false, erro: 'Informe o nome da campanha' })
		expect(validarCampanha({ ...base, id_externo: 'abc123' })).toMatchObject({ ok: false, erro: 'O ID da campanha no Google e na Meta tem só números' })
		expect(validarCampanha({ ...base, fim: '2026-08-01' })).toMatchObject({ ok: false, erro: 'O fim não pode ser antes do início' })
		expect(validarCampanha({ ...base, inicio: '01/09/2026' })).toMatchObject({ ok: false })
		expect(validarCampanha({ ...base, mensagem_prefixo: 'Vi no Instagram' })).toMatchObject({
			ok: false, erro: 'A mensagem do anúncio só vale para campanha que manda direto para o WhatsApp',
		})
	})

	it('WhatsApp direto aceita a mensagem do anúncio; WebMotors aceita ID com letras', () => {
		const w = validarCampanha({ ...base, plataforma: 'meta', destino: 'whatsapp', mensagem_prefixo: ' Vi no Instagram o ' })
		expect(w.ok && w.valor.mensagem_prefixo).toBe('Vi no Instagram o')
		expect(validarCampanha({ ...base, plataforma: 'webmotors', id_externo: 'wm-set26' }).ok).toBe(true)
	})
})

describe('situacaoDaCampanha', () => {
	const hoje = '2026-10-02'
	it('ativa, agendada ou encerrada pelas datas', () => {
		expect(situacaoDaCampanha({ inicio: '2026-09-01', fim: null }, hoje)).toBe('ativa')
		expect(situacaoDaCampanha({ inicio: '2026-09-01', fim: '2026-10-02' }, hoje)).toBe('ativa')
		expect(situacaoDaCampanha({ inicio: '2026-10-05', fim: null }, hoje)).toBe('agendada')
		expect(situacaoDaCampanha({ inicio: '2026-09-01', fim: '2026-10-01' }, hoje)).toBe('encerrada')
	})
})

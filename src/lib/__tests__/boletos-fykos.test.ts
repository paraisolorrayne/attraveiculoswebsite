import { createHmac } from 'node:crypto'
import { afterEach, describe, it, expect } from 'vitest'
import { situacaoDoBoleto, type Boleto } from '@/lib/boletos'
import { boletoParaOFykos, configuracaoBoletosFykos, corpoDoAviso, lerEventoDoFykos } from '@/lib/boletos-fykos'
import { verifyCrmSignature } from '@/lib/crm-webhook'

const HOJE = '2026-11-18'
const AGORA = new Date('2026-11-18T15:00:00Z')
const ID = '0b6c1c1e-7a2f-4c55-9d0e-3f6f5a1b2c3d'

const boleto = (p: Partial<Boleto> = {}): Boleto => ({
	id: ID, nome: 'Maria da Silva', telefone: '34999990000', email: null, vencimento: '2026-11-25', valor: 1250.5, descricao: 'Parcela 3 de 12',
	status: 'aberto', pago_em: null, origem: 'planilha', lote_id: null, lembretes: 0, ultimo_lembrete_em: null,
	promessa_em: null, comprovante_em: null, comprovante_url: null, falha_envio: null, criado_por_nome: 'Gabriel', criado_em: '', atualizado_em: '', ...p,
})

describe('situação com o que o cliente respondeu', () => {
	it('comprovante vem antes de tudo que está aberto; promessa só vale até a data', () => {
		expect(situacaoDoBoleto(boleto({ vencimento: '2026-11-10', comprovante_em: '2026-11-18T12:00:00Z', promessa_em: '2026-11-20' }), HOJE)).toBe('comprovante')
		expect(situacaoDoBoleto(boleto({ status: 'em_negociacao', comprovante_em: '2026-11-18T12:00:00Z' }), HOJE)).toBe('comprovante')
		expect(situacaoDoBoleto(boleto({ vencimento: '2026-11-10', promessa_em: '2026-11-20' }), HOJE)).toBe('promessa')
		expect(situacaoDoBoleto(boleto({ vencimento: '2026-11-10', promessa_em: HOJE }), HOJE)).toBe('promessa')
		// Prometeu para ontem e não pagou: volta a ser atraso.
		expect(situacaoDoBoleto(boleto({ vencimento: '2026-11-10', promessa_em: '2026-11-17' }), HOJE)).toBe('atraso')
		// Pago encerra, com ou sem comprovante.
		expect(situacaoDoBoleto(boleto({ status: 'pago', comprovante_em: '2026-11-18T12:00:00Z' }), HOJE)).toBe('pago')
	})
})

describe('aviso do painel ao Fykos', () => {
	afterEach(() => {
		delete process.env.FYKOS_BOLETOS_WEBHOOK_URL
		delete process.env.FYKOS_BOLETOS_WEBHOOK_SECRET
	})

	it('manda o boleto inteiro, com o telefone em E.164', () => {
		expect(boletoParaOFykos(boleto())).toEqual({
			id: ID, nome: 'Maria da Silva', telefone: '+5534999990000', email: null, vencimento: '2026-11-25', valor: 1250.5,
			descricao: 'Parcela 3 de 12', status: 'aberto', pago_em: null, promessa_em: null, comprovante_em: null,
		})
	})

	it('o corpo assinado é o mesmo que quem recebe confere', () => {
		const corpo = corpoDoAviso('boleto.cadastrado', 'ev-1', [boletoParaOFykos(boleto())], AGORA)
		expect(JSON.parse(corpo)).toMatchObject({ evento: 'boleto.cadastrado', id_evento: 'ev-1', enviado_em: '2026-11-18T15:00:00.000Z', boletos: [{ id: ID }] })
		const assinatura = createHmac('sha256', 'segredo-de-teste').update(corpo).digest('hex')
		expect(verifyCrmSignature(corpo, assinatura, 'segredo-de-teste')).toBe(true)
		expect(verifyCrmSignature(corpo + ' ', assinatura, 'segredo-de-teste')).toBe(false)
		expect(verifyCrmSignature(corpo, assinatura, 'outro-segredo')).toBe(false)
	})

	it('sem endereço e segredo fica desligado; fora da própria máquina, só https', () => {
		expect(configuracaoBoletosFykos()).toBeNull()
		process.env.FYKOS_BOLETOS_WEBHOOK_SECRET = 'x'
		process.env.FYKOS_BOLETOS_WEBHOOK_URL = 'http://fykos.exemplo/boletos'
		expect(configuracaoBoletosFykos()).toBeNull()
		process.env.FYKOS_BOLETOS_WEBHOOK_URL = 'https://usuario:senha@fykos.exemplo/boletos'
		expect(configuracaoBoletosFykos()).toBeNull()
		process.env.FYKOS_BOLETOS_WEBHOOK_URL = 'https://fykos.exemplo/boletos'
		expect(configuracaoBoletosFykos()).toEqual({ url: 'https://fykos.exemplo/boletos', secret: 'x' })
		process.env.FYKOS_BOLETOS_WEBHOOK_URL = 'http://localhost:3998/boletos'
		expect(configuracaoBoletosFykos()?.url).toBe('http://localhost:3998/boletos')
	})
})

describe('evento do Fykos para o painel', () => {
	const base = { id_evento: 'fy-1', boleto_id: ID, ocorrido_em: '2026-11-18T14:30:00Z' }
	const ler = (c: Record<string, unknown>) => lerEventoDoFykos(c, HOJE, AGORA)

	it('promessa de pagamento traz o dia e a fala do cliente', () => {
		const r = ler({ ...base, evento: 'promessa.pagamento', dados: { data: '2026-11-25', mensagem: '  Pago na quarta que vem  ' } })
		expect(r).toEqual({
			evento: { evento: 'promessa.pagamento', idEvento: 'fy-1', boletoId: ID, ocorridoEm: new Date('2026-11-18T14:30:00Z'), texto: 'Pago na quarta que vem', data: '2026-11-25', url: null, template: null },
		})
		// Data brasileira também serve.
		expect(ler({ ...base, evento: 'promessa.pagamento', dados: { data: '25/11/2026' } })).toMatchObject({ evento: { data: '2026-11-25' } })
		expect(ler({ ...base, evento: 'promessa.pagamento', dados: {} })).toEqual({ erro: 'dados.data precisa ser uma data AAAA-MM-DD' })
	})

	it('comprovante traz só o link, e ele precisa ser https', () => {
		expect(ler({ ...base, evento: 'comprovante.recebido', dados: { url: 'https://fykos.exemplo/anexos/1.jpg', pago_em: '2026-11-18' } })).toMatchObject({
			evento: { url: 'https://fykos.exemplo/anexos/1.jpg', data: '2026-11-18' },
		})
		expect(ler({ ...base, evento: 'comprovante.recebido' })).toMatchObject({ evento: { url: null, data: null } })
		expect(ler({ ...base, evento: 'comprovante.recebido', dados: { url: 'http://fykos.exemplo/1.jpg' } })).toEqual({ erro: 'dados.url precisa ser um link https' })
		expect(ler({ ...base, evento: 'comprovante.recebido', dados: { url: 'javascript:alert(1)' } })).toEqual({ erro: 'dados.url precisa ser um link https' })
		expect(ler({ ...base, evento: 'comprovante.recebido', dados: { pago_em: '2026-11-19' } })).toEqual({ erro: 'dados.pago_em não pode ser no futuro' })
	})

	it('lembrete enviado guarda o modelo; lembrete que falhou guarda o motivo', () => {
		expect(ler({ ...base, evento: 'lembrete.enviado', dados: { template: 'lembrete_boleto_d3' } })).toMatchObject({ evento: { template: 'lembrete_boleto_d3', texto: null } })
		expect(ler({ ...base, evento: 'lembrete.falhou', dados: { motivo: 'número sem WhatsApp' } })).toMatchObject({ evento: { texto: 'número sem WhatsApp' } })
	})

	it('diz o que faltou, para quem está integrando', () => {
		expect(ler({ ...base, evento: 'boleto.pago' })).toMatchObject({ erro: expect.stringContaining('evento desconhecido') })
		expect(ler({ evento: 'cliente.respondeu', boleto_id: ID })).toMatchObject({ erro: expect.stringContaining('id_evento') })
		expect(ler({ ...base, evento: 'cliente.respondeu', boleto_id: '123' })).toMatchObject({ erro: expect.stringContaining('boleto_id') })
		expect(ler({ ...base, evento: 'cliente.respondeu', ocorrido_em: 'ontem' })).toMatchObject({ erro: expect.stringContaining('ocorrido_em') })
		expect(lerEventoDoFykos([], HOJE, AGORA)).toMatchObject({ erro: expect.stringContaining('objeto') })
	})

	it('sem horário vale agora; horário no futuro é trazido para agora', () => {
		expect(ler({ id_evento: 'a', boleto_id: ID, evento: 'cliente.respondeu' })).toMatchObject({ evento: { ocorridoEm: AGORA } })
		expect(ler({ ...base, evento: 'cliente.respondeu', ocorrido_em: '2026-11-19T00:00:00Z' })).toMatchObject({ evento: { ocorridoEm: AGORA } })
	})
})

import { describe, it, expect } from 'vitest'
import { anuncioDoPayload, centavos, saldoDoPayload, valorNoTexto } from '@/lib/meta-ads'
import { carroDoAnuncio, chaveDoNome, planejar, type CardDoQuadro } from '@/lib/meta-campanhas'

describe('saldo da Meta', () => {
	it('lê o valor do texto da forma de pagamento, em pt-BR e en', () => {
		expect(valorNoTexto('Saldo disponível (R$1.234,56 BRL)')).toBe(1234.56)
		expect(valorNoTexto('Available balance (R$1,234.56 BRL)')).toBe(1234.56)
		expect(valorNoTexto('Saldo disponível (R$ 980,00 BRL)')).toBe(980)
		expect(valorNoTexto('Visa *1234')).toBe(1234)
		expect(valorNoTexto(undefined)).toBeNull()
	})

	it('dinheiro da conta vem em centavos', () => {
		expect(centavos('150075')).toBe(1500.75)
		expect(centavos(undefined)).toBeNull()
	})

	it('conta pré-paga mostra o disponível e não inventa valor a pagar', () => {
		const s = saldoDoPayload(
			{ name: 'Attra', account_status: 1, currency: 'BRL', balance: '0', amount_spent: '500000', spend_cap: '0', is_prepay_account: true, funding_source_details: { display_string: 'Saldo disponível (R$2.500,10 BRL)' } },
			830.5,
		)
		expect(s.disponivel).toBe(2500.1)
		expect(s.aPagar).toBeNull()
		expect(s.gastoNoMes).toBe(830.5)
		expect(s.restanteDoLimite).toBeNull()
		expect(s.ativa).toBe(true)
	})

	it('conta no cartão mostra o valor em aberto e o que falta do limite', () => {
		const s = saldoDoPayload(
			{ name: 'Attra', account_status: 3, currency: 'BRL', balance: '123456', amount_spent: '700000', spend_cap: '1000000', is_prepay_account: false, funding_source_details: { display_string: 'Visa *1234' } },
			null,
		)
		expect(s.disponivel).toBeNull()
		expect(s.aPagar).toBe(1234.56)
		expect(s.restanteDoLimite).toBe(3000)
		expect(s.ativa).toBe(false)
	})
})

describe('anúncios da Meta no quadro', () => {
	const anuncio = (id: string, nome: string, p: Partial<{ noAr: boolean; campanhaId: string; gasto30d: number | null }> = {}) => ({
		id, nome, noAr: p.noAr ?? true, criadoEm: '2026-11-10T12:00:00-0300', campanhaId: p.campanhaId ?? '900', campanhaNome: 'Estoque novembro', gasto30d: p.gasto30d === undefined ? 100 : p.gasto30d,
	})
	const card = (p: Partial<CardDoQuadro> & { id: string }): CardDoQuadro => ({ campaign_id: 'c1', vehicle_name: '', status: 'publicada', meta_ad_ids: [], ...p })

	it('tira a etiqueta e o nome de quem fez do nome do anúncio', () => {
		expect(carroDoAnuncio('[VIDEO] Porsche 911 Turbo S Cabriolet 2022 | Gabriel')).toBe('Porsche 911 Turbo S Cabriolet 2022')
		expect(carroDoAnuncio('[VA][CARROSSEL]  Ferrari  296 GTB')).toBe('Ferrari 296 GTB')
		expect(carroDoAnuncio('[SEM NOME]')).toBe('[SEM NOME]')
		expect(chaveDoNome('Mercedes-AMG G 63 — 2024')).toBe('mercedes amg g 63 2024')
	})

	it('recusa payload sem id numérico', () => {
		expect(anuncioDoPayload({ id: '12/../x', name: 'a', campaign: { id: '1' } })).toBeNull()
		expect(anuncioDoPayload({ id: '12', name: 'a', effective_status: 'ACTIVE', campaign: { id: '1', name: 'C' } })?.noAr).toBe(true)
	})

	it('quadro vazio: cria a campanha e um card por carro, somando os anúncios do mesmo carro', () => {
		const p = planejar([anuncio('1', '[VIDEO] Porsche 911 | Gabriel'), anuncio('2', '[CARROSSEL] Porsche 911 | Gabriel', { gasto30d: 50 }), anuncio('3', 'Ferrari 296')], [], [])
		expect(p.campanhas).toEqual([{ metaId: '900', nome: 'Estoque novembro' }])
		expect(p.criar.map(c => [c.nome, c.adIds, c.gasto])).toEqual([['Porsche 911', ['1', '2'], 150], ['Ferrari 296', ['3'], 100]])
		expect(p.criar[0].notas).toBe('Anúncio na Meta: [VIDEO] Porsche 911 | Gabriel')
		expect(p.criar[0].desde).toBe('2026-11-10')
	})

	it('anúncio pausado sem card fica de fora', () => {
		const p = planejar([anuncio('1', 'Porsche 911', { noAr: false })], [], [])
		expect(p).toEqual({ campanhas: [], criar: [], atualizar: [] })
	})

	it('liga ao card digitado à mão em vez de duplicar', () => {
		const p = planejar([anuncio('1', '[VIDEO] Porsche 911 | Gabriel')], [{ id: 'c1', meta_campaign_id: null }], [card({ id: 'v1', vehicle_name: 'porsche 911' })])
		expect(p.criar).toEqual([])
		expect(p.campanhas).toEqual([])
		expect(p.atualizar).toEqual([{ id: 'v1', adIds: ['1'], noAr: true, gasto: 100 }])
	})

	it('card já ligado: marca pausado e nunca muda de coluna; anúncio que sumiu fica fora do ar', () => {
		const cards = [card({ id: 'v1', vehicle_name: 'Porsche 911', meta_ad_ids: ['1'] }), card({ id: 'v2', vehicle_name: 'Ferrari 296', meta_ad_ids: ['7'], status: 'encerrada_ganho' })]
		const p = planejar([anuncio('1', 'Porsche 911', { noAr: false, gasto30d: null })], [{ id: 'c1', meta_campaign_id: '900' }], cards)
		expect(p.criar).toEqual([])
		expect(p.atualizar).toEqual([
			{ id: 'v1', adIds: ['1'], noAr: false, gasto: null },
			{ id: 'v2', adIds: ['7'], noAr: false, gasto: null },
		])
	})

	it('rodar duas vezes não duplica', () => {
		const anuncios = [anuncio('1', 'Porsche 911'), anuncio('2', 'Ferrari 296')]
		const p1 = planejar(anuncios, [], [])
		const cards = p1.criar.map((c, i) => card({ id: `v${i}`, vehicle_name: c.nome, meta_ad_ids: c.adIds }))
		const p2 = planejar(anuncios, [{ id: 'c1', meta_campaign_id: '900' }], cards)
		expect(p2.criar).toEqual([])
		expect(p2.campanhas).toEqual([])
		expect(p2.atualizar).toHaveLength(2)
	})
})

describe('métricas do anúncio', async () => {
	const { metricasDaLinha, montarMetricas, nomeDaPosicao } = await import('@/lib/meta-ads')
	const linha = (p: Record<string, unknown>) => ({
		spend: '100.50', impressions: '2000', reach: '1500', inline_link_clicks: '40',
		actions: [
			{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '8' },
			{ action_type: 'landing_page_view', value: '30' },
			{ action_type: 'post_engagement', value: '999' },
		],
		video_play_actions: [{ action_type: 'video_view', value: '500' }],
		video_p100_watched_actions: [{ action_type: 'video_view', value: '50' }],
		...p,
	})

	it('lê só as ações que interessam e não confunde engajamento com conversa', () => {
		const m = metricasDaLinha(linha({}))
		expect(m).toMatchObject({ gasto: 100.5, impressoes: 2000, cliquesNoLink: 40, conversas: 8, leads: 0, visitasNaPagina: 30 })
		expect(m.video).toEqual({ inicios: 500, p25: 0, p50: 0, p75: 0, p100: 50 })
	})

	it('linha vazia é zero, não erro', () => {
		expect(metricasDaLinha({}).gasto).toBe(0)
	})

	it('soma os anúncios do carro, mantém o alcance por anúncio e ordena dias e posições', () => {
		const m = montarMetricas(
			'30d',
			[linha({ ad_id: '1', ad_name: 'Vídeo' }), linha({ ad_id: '2', ad_name: 'Carrossel', spend: '50', reach: '700' })],
			[linha({ date_start: '2026-11-02', spend: '10' }), linha({ date_start: '2026-11-01', spend: '5' }), linha({ date_start: '2026-11-01', spend: '7' })],
			[
				linha({ publisher_platform: 'instagram', platform_position: 'instagram_stories', spend: '20' }),
				linha({ publisher_platform: 'instagram', platform_position: 'instagram_reels', spend: '90' }),
				linha({ publisher_platform: 'audience_network', platform_position: 'an_classic', spend: '1' }),
			],
		)
		expect(m.total.gasto).toBe(150.5)
		expect(m.total.conversas).toBe(16)
		expect(m.anuncios.map(a => a.alcance)).toEqual([1500, 700])
		expect(m.porDia.map(d => [d.dia, d.gasto])).toEqual([['2026-11-01', 12], ['2026-11-02', 10]])
		expect(m.porPosicionamento.map(p => p.nome)).toEqual(['Instagram Reels', 'Instagram Stories', 'Audience network an classic'])
	})

	it('posição desconhecida vira texto legível', () => {
		expect(nomeDaPosicao('facebook', 'feed')).toBe('Facebook Feed')
		expect(nomeDaPosicao(undefined, undefined)).toBe('Outros')
	})
})

describe('anúncio renomeado', () => {
	it('não cria um segundo card para anúncios que já estão num card', () => {
		const a = (id: string, nome: string) => ({ id, nome, noAr: true, criadoEm: null, campanhaId: '900', campanhaNome: 'C', gasto30d: 10 })
		const cards = [{ id: 'v1', campaign_id: 'c1', vehicle_name: 'Porsche 911', status: 'publicada', meta_ad_ids: ['1', '2'] }]
		const p = planejar([a('1', 'Porsche 911'), a('2', 'Porsche 911 Turbo S')], [{ id: 'c1', meta_campaign_id: '900' }], cards)
		expect(p.criar).toEqual([])
		expect(p.atualizar).toEqual([{ id: 'v1', adIds: ['1', '2'], noAr: true, gasto: 20 }])
	})
})

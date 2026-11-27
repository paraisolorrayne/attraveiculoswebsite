import { describe, expect, it } from 'vitest'
import { determineLikelyOrigin, extractUrlParams } from '@/lib/visitors/consultas/sessao-detalhe'

/**
 * Clique em anúncio do Google feito no iPhone (com ATT) chega sem `gclid`: vem
 * `gbraid` ou `wbraid` no lugar. Até 27/11/2026 a tela da sessão olhava só o
 * `gclid`, e essa visita paga, que chega com o Google como referrer, aparecia
 * como "Organic - Google". O classificador comum (src/lib/traffic-channel.ts)
 * já tratava os três como o mesmo clique pago.
 */
describe('origem provável da sessão com clique do Google no iPhone', () => {
	const doGoogle = { referrer_domain: 'www.google.com' }

	it.each(['gclid', 'gbraid', 'wbraid'])('%s na sessão é Google Ads', (campo) => {
		expect(determineLikelyOrigin({ ...doGoogle, [campo]: 'x' }, {})).toEqual({
			origin: 'Paid - Google Ads',
			confidence: 'alta',
		})
	})

	it.each(['gclid', 'gbraid', 'wbraid'])('%s só na primeira URL também é Google Ads', (campo) => {
		expect(determineLikelyOrigin(doGoogle, { [campo]: 'x' }).origin).toBe('Paid - Google Ads')
	})

	it('sem nenhum dos três, o Google como referrer continua orgânico', () => {
		expect(determineLikelyOrigin(doGoogle, {}).origin).toBe('Organic - Google')
	})

	it('a primeira URL entrega gbraid e wbraid', () => {
		expect(extractUrlParams('https://attraveiculos.com.br/?gbraid=gb1&wbraid=wb1&outro=1')).toEqual({
			gbraid: 'gb1',
			wbraid: 'wb1',
		})
	})
})

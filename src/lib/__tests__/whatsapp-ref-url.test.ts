import { describe, expect, it } from 'vitest'
import { comRefNoLinkWhatsApp, extractWhatsAppRef } from '@/lib/whatsapp-ref'

const SID = '1759412345678-k3j9x2'

describe('comRefNoLinkWhatsApp', () => {
	it('anexa [ref: <session_id>] ao fim do texto do wa.me, mantendo %20', () => {
		const url = comRefNoLinkWhatsApp('https://wa.me/553432563200?text=Ol%C3%A1!%20Tenho%20interesse%20no%20Ferrari%20296', SID)
		expect(url).toBe(`https://wa.me/553432563200?text=Ol%C3%A1!%20Tenho%20interesse%20no%20Ferrari%20296%20%5Bref%3A%20${SID}%5D`)
		expect(extractWhatsAppRef(decodeURIComponent(new URL(url).searchParams.get('text')!))).toBe(SID)
	})

	it('vale para api.whatsapp.com/send e preserva os outros parâmetros', () => {
		const url = comRefNoLinkWhatsApp('https://api.whatsapp.com/send?phone=553432563200&text=Oi&type=phone_number', SID)
		expect(url).toBe(`https://api.whatsapp.com/send?phone=553432563200&text=Oi%20%5Bref%3A%20${SID}%5D&type=phone_number`)
	})

	it('link sem texto ganha só o marcador', () => {
		expect(comRefNoLinkWhatsApp('https://wa.me/553432563200', SID)).toBe(`https://wa.me/553432563200?text=%5Bref%3A%20${SID}%5D`)
	})

	it('não duplica o marcador em clique repetido', () => {
		const uma = comRefNoLinkWhatsApp('https://wa.me/553432563200?text=Oi', SID)
		expect(comRefNoLinkWhatsApp(uma, SID)).toBe(uma)
	})

	it('sem sessão ou fora do WhatsApp, devolve o link como veio', () => {
		expect(comRefNoLinkWhatsApp('https://wa.me/553432563200?text=Oi', null)).toBe('https://wa.me/553432563200?text=Oi')
		expect(comRefNoLinkWhatsApp('tel:+553432563200', SID)).toBe('tel:+553432563200')
		expect(comRefNoLinkWhatsApp('https://attraveiculos.com.br/?text=Oi', SID)).toBe('https://attraveiculos.com.br/?text=Oi')
	})
})
